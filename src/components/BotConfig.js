import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  WhatsApp as WhatsAppIcon,
  Message as MessageIcon,
  Timer as TimerIcon,
  Save as SaveIcon,
  Warning as WarningIcon,
  Check as CheckIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import io from 'socket.io-client';
import config from '../config';

// Determina a URL do backend dinamicamente
const backendUrl = config.apiUrl;

console.log(`[SocketIO] Conectando ao backend em: ${backendUrl}`);

const socket = io(backendUrl, {
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 2000,
  timeout: 30000,
  pingTimeout: 60000,
  pingInterval: 25000,
});

const BotConfig = memo(() => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bot, setBot] = useState(null);
  const [error, setError] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [connected, setConnected] = useState(false);
  const [starting, setStarting] = useState(false);
  const [botStatus, setBotStatus] = useState('unknown');
  const initialLoadDone = useRef(false);
  const [scanAttempts, setScanAttempts] = useState(0);
  const MAX_SCAN_ATTEMPTS = 3;
  const [userInitiated, setUserInitiated] = useState(false);
  const [stats, setStats] = useState({
    messageCount: 0,
    totalCost: 0,
    lastActive: null,
  });
  const [blockedNumbers, setBlockedNumbers] = useState([]);
  const [numberToBlock, setNumberToBlock] = useState('');

  const fetchBlockedNumbers = useCallback(async () => {
    const token = localStorage.getItem('idToken');
    if (!token || !id) return;
    console.log(`Buscando números bloqueados para o bot ${id}...`);
    try {
      const response = await fetch(`${config.apiUrl}/api/bots/${id}/blocked`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBlockedNumbers(data || []);
        console.log("Números bloqueados carregados:", data);
      } else {
        console.error('Erro ao buscar bloqueados:', response.statusText);
        setError('Falha ao carregar lista de bloqueados.');
      }
    } catch (err) {
      console.error('Erro ao buscar bloqueados (catch):', err);
      setError('Erro de rede ao buscar bloqueados.');
    }
  }, [id]);

  const checkConnectionStatus = useCallback(async () => {
    if (!id) return;
    console.log(`Verificando status do bot ${id} no Firestore...`);
    try {
      const botDoc = await getDoc(doc(db, 'bots', id));
      if (botDoc.exists()) {
        const botData = botDoc.data();
        const firestoreStatus = botData.status || 'stopped';
        console.log(`Status no Firestore: ${firestoreStatus}`);
        
        setBotStatus(prev => prev !== firestoreStatus ? firestoreStatus : prev);
        setConnected(prev => prev !== (firestoreStatus === 'connected') ? (firestoreStatus === 'connected') : prev);
        setStarting(prev => prev !== (firestoreStatus === 'starting') ? (firestoreStatus === 'starting') : prev);
        
        if (firestoreStatus === 'connected') {
          fetchBlockedNumbers();
          setQrCode('');
          sessionStorage.removeItem('lastQrCode');
          setUserInitiated(false);
          setScanAttempts(0);
        } else if (firestoreStatus === 'starting') {
          setUserInitiated(true);
        } else {
          setQrCode('');
          sessionStorage.removeItem('lastQrCode');
          setUserInitiated(false);
        }
      } else {
         setError('Bot não encontrado no Firestore durante verificação de status.');
         setBotStatus('error');
      }
    } catch (error) {
      console.error('Erro ao verificar status de conexão via Firestore:', error);
      setError('Falha ao verificar status do bot.');
      setBotStatus('error');
    }
  }, [id, fetchBlockedNumbers]);

  const loadBot = useCallback(async () => {
    setBotStatus('loading');
    setQrCode('');
    sessionStorage.removeItem('lastQrCode');
    setError('');
    setUserInitiated(false);
    setScanAttempts(0);
    
    try {
      const botDoc = await getDoc(doc(db, 'bots', id));
      if (botDoc.exists()) {
        const botData = botDoc.data();
        setBot(botData);
        const initialStatus = botData.status || 'stopped';
        console.log('Dados do bot carregados do Firestore. Status inicial:', initialStatus);

        setBotStatus(initialStatus);
        setConnected(initialStatus === 'connected');
        setStarting(initialStatus === 'starting');
        
        if (initialStatus === 'connected') {
          fetchBlockedNumbers();
        }
        
        setStats({
          messageCount: botData.messageCount || 0,
          totalCost: botData.totalCost || 0,
          lastActive: botData.lastActive,
        });
      } else {
        setError('Bot não encontrado');
        setBotStatus('error');
      }
    } catch (error) {
      console.error('Erro ao carregar bot:', error);
      setError('Erro ao carregar dados do bot');
      setBotStatus('error');
    } finally {
      initialLoadDone.current = true;
      console.log('loadBot finalizado.');
    }
  }, [id, fetchBlockedNumbers]);

  // 1. useEffect para gerenciar Socket.IO (conexão, listeners, subscribe)
  useEffect(() => {
    console.log(`SOCKET useEffect running for ID: ${id}`);

    const setupListeners = () => {
      console.log('[Listeners] Configurando listeners do socket...');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('qr');
      socket.off('connected');
      socket.off('disconnected');

      socket.on('connect', () => {
        console.log(`[SocketIO] Conectado ao servidor. SocketID: ${socket.id}`);
        if (id) {
          console.log(`[SocketIO] Tentando subscribe para o bot: ${id}`);
          socket.emit('subscribe', id);
        }
      });

      socket.on('disconnect', (reason) => {
        console.log(`[SocketIO] Desconectado do servidor. Razão: ${reason}`);
      });

      socket.on('qr', (qr) => {
        console.log('QR Code recebido no frontend:', qr);
        setQrCode(qr);
        setBotStatus('qr_received');
        setConnected(false);
        setStarting(false);
        setError('');
        const currentQr = qr;
        setTimeout(() => {
          setQrCode(prevQr => {
            if (prevQr === currentQr) {
              console.log('[Timeout] QR Code expirou:', currentQr.substring(0, 10));
              setError('QR code expirou. Clique para gerar um novo.');
              setBotStatus('stopped');
              return '';
            }
            return prevQr;
          });
        }, 30000);
      });

      socket.on('connected', () => {
        console.log('Evento BAILYES connected recebido no frontend');
        setBotStatus('connected');
        setConnected(true);
        setStarting(false);
        setQrCode('');
        setError('');
        fetchBlockedNumbers();
      });

      socket.on('disconnected', (data) => {
        console.log('Evento BAILYES disconnected recebido no frontend:', data);
        setBotStatus('stopped');
        setConnected(false);
        setStarting(false);
        setQrCode('');
        setError(data?.reason || 'Desconectado. Tente novamente.');
      });
    };

    if (!socket.connected) {
      console.log('[SocketIO] Socket não conectado. Configurando listeners e tentando conectar...');
      setupListeners();
      socket.connect();
    } else {
      console.log(`[SocketIO] Socket JÁ conectado. SocketID: ${socket.id}. Configurando listeners e fazendo subscribe.`);
      setupListeners();
      if (id) {
        socket.emit('subscribe', id);
      }
    }

    // Função de limpeza
    return () => {
      console.log(`SOCKET useEffect cleanup for ID: ${id}.`);
      socket.off('connect');
      socket.off('disconnect');
      socket.off('qr');
      socket.off('connected');
      socket.off('disconnected');
      if (id) {
        console.log(`SOCKET useEffect cleanup: Enviando unsubscribe para ${id}.`);
        socket.emit('unsubscribe', id);
      }
    };
  }, [id, fetchBlockedNumbers]);

  // 2. useEffect para carregar dados iniciais do bot
  useEffect(() => {
    console.log(`LOAD DATA useEffect running for ID: ${id}`);
    if (id) {
        loadBot();
    }
  }, [id, loadBot]);

  // 3. useEffect para o intervalo de verificação de status
  useEffect(() => {
    console.log(`STATUS CHECK useEffect running for ID: ${id}`);
    const statusInterval = setInterval(() => {
      if (id) {
          checkConnectionStatus();
      }
    }, 5000);

    return () => {
      console.log(`STATUS CHECK useEffect cleanup for ID: ${id}.`);
      clearInterval(statusInterval);
    };
  }, [id, checkConnectionStatus]);

  // 4. useEffect para atualizar userInitiated (este está OK)
  useEffect(() => {
    if (botStatus === 'starting') {
      console.log('Bot está iniciando, definindo userInitiated=true');
      setUserInitiated(true);
    }
  }, [botStatus]);

  async function handleStartBot() {
    console.log('Tentando iniciar o bot...');
    setUserInitiated(true);
    sessionStorage.removeItem('lastQrCode');
    setError('');
    setScanAttempts(0);
    setStarting(true);
    setBotStatus('starting');

    const token = localStorage.getItem('idToken');
    if (!token) {
      setError('Autenticação necessária. Faça login novamente.');
      setStarting(false);
      setBotStatus('error');
      return;
    }

    try {
      console.log(`Enviando requisição para iniciar bot ${id}...`);
        
      const apiUrl = `${config.apiUrl}/api/bots/${id}/start`;
      console.log(`[handleStartBot] Enviando POST para: ${apiUrl}`);
      console.log(`[handleStartBot] Com token: ${token ? 'Sim' : 'Não'}`);

      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      .then(async response => {
        console.log(`[handleStartBot] Resposta recebida do servidor. Status: ${response.status}`);
        const responseBody = await response.text();
        console.log(`[handleStartBot] Corpo da resposta: ${responseBody}`);

        if (!response.ok) {
          let errorData = { message: `Erro ${response.status}: ${response.statusText}` };
          try {
            errorData = JSON.parse(responseBody);
          } catch (parseError) {
            console.warn('[handleStartBot] Não foi possível parsear a resposta de erro como JSON.');
            errorData.message = responseBody || errorData.message;
          }

          console.error('[handleStartBot] Erro na resposta do servidor ao iniciar:', response.status, errorData);
          let errorMsg = errorData.message || 'Erro ao iniciar bot';
          if (response.status === 401 || response.status === 403) {
            errorMsg = 'Autenticação falhou. Faça login novamente.';
            localStorage.removeItem('idToken');
          }
          setError(errorMsg);
          setStarting(false);
          setBotStatus('error');
          return;
        }

        console.log('Requisição para iniciar bot enviada com sucesso. Aguardando QR code...');
      })
      .catch(error => {
        console.error('Erro inesperado ao tentar iniciar bot (fetch catch): ', error);
        setError(error.message || 'Erro inesperado ao iniciar bot');
        setStarting(false);
        setBotStatus('error');
      });

      setTimeout(() => {
        if (!qrCode && botStatus === 'starting' && userInitiated) {
          console.log('Timeout - QR code não recebido em tempo hábil');
          setError('QR code não recebido. Verifique a conexão do servidor e tente novamente.');
          setStarting(false);
          setBotStatus('error');
          setUserInitiated(false);
        }
      }, 30000);

    } catch (error) {
      console.error('Erro inesperado ao tentar iniciar bot (try/catch geral):', error);
      setError(error.message || 'Erro inesperado ao iniciar bot');
      setStarting(false);
      setBotStatus('error');
      setUserInitiated(false);
    }
  }

  async function handleStopBot() {
    setStarting(true);
    setBotStatus('stopping');
    setError('');
    const token = localStorage.getItem('idToken');

    if (!token) {
      console.log('ID Token não encontrado para parar o bot');
      setError('Você precisa estar logado para parar o bot.');
      setStarting(false);
      setBotStatus(connected ? 'connected' : 'stopped');
      return;
    }

    try {
      const response = await fetch(`${config.apiUrl}/api/bots/${id}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        console.error('Erro ao parar bot (resposta):', response.status, errorData);
        let errorMsg = errorData.message || 'Erro ao parar bot';
        if (response.status === 401 || response.status === 403) {
          errorMsg = 'Autenticação falhou. Faça login novamente.';
          localStorage.removeItem('idToken');
        }
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      console.log('Bot parado com sucesso via API');
      setConnected(false);
      setQrCode('');
      setBotStatus('stopped');
      sessionStorage.removeItem('lastQrCode');
    } catch (error) {
      console.error('Erro ao parar bot (catch):', error);
      setError(error.message || 'Falha ao parar o bot');
      checkConnectionStatus();
    } finally {
      setStarting(false);
    }
  }

  async function handleSave() {
    try {
      await updateDoc(doc(db, 'bots', id), {
        systemMessage: bot.systemMessage
      });
      setError('');
    } catch (error) {
      console.error('Erro ao salvar bot:', error);
      setError('Erro ao salvar configurações');
    }
  }

  function handleRefreshQR() {
    console.log("Tentando atualizar QR Code...");
    setScanAttempts(0);
    handleStartBot();
  }

  async function handleBlockNumber() {
    await fetchBlockedNumbers();
  }

  async function handleUnblockNumber(number) {
    await fetchBlockedNumbers();
  }

  const showQrCode = qrCode && qrCode.length > 0 && botStatus === 'qr_received' && userInitiated;
  const showStartingSpinner = starting && botStatus === 'starting';

  if (botStatus === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (botStatus === 'error' && error && !error.includes('conexão com o servidor')) {
     return (
      <Container>
        <Alert severity="error" sx={{ mt: 2 }}>{error || 'Ocorreu um erro desconhecido.'}</Alert>
        <Button onClick={loadBot} sx={{mt: 1}}>Tentar Novamente</Button>
      </Container>
    );
  }

  if (!bot) {
    return (
      <Container>
        <Alert severity="warning" sx={{ mt: 2 }}>
          Bot não encontrado ou carregando...
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      {error && (
        <Alert severity={error.includes('Conflito') ? "warning" : "error"} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Configurar Bot: {bot.name}
        </Typography>
        {connected && (
          <Button
            variant="contained"
            color="error"
            startIcon={<StopIcon />}
            onClick={handleStopBot}
            disabled={starting && botStatus === 'stopping'}
          >
            {starting && botStatus === 'stopping' ? 'Parando...' : 'Parar Bot'}
          </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Status da Conexão</Typography>

            {/* Status: Iniciando (NÃO esconde mais o QR se ele existir) */}
            {botStatus === 'starting' && (
              <Box textAlign="center" sx={{ mb: 2 }}>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                <Typography display="inline">Iniciando...</Typography>
              </Box>
            )}
            {/* Status: QR code (Renderiza se qrCode não for vazio) */}
            {qrCode && (
              <Box textAlign="center">
                <Box
                  sx={{
                    p: 3,
                    display: 'inline-block',
                    border: '1px solid #ccc',
                    mb: 2,
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    position: 'relative',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {console.log('Renderizando QR code:', qrCode)}
                  <QRCodeSVG
                    value={qrCode}
                    size={200}
                    level="H"
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                    includeMargin={true}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: '#25D366',
                      borderRadius: '50%',
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  >
                    <WhatsAppIcon sx={{ color: 'white', fontSize: 24 }} />
                  </Box>
                </Box>
                <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
                  Abra o WhatsApp no seu celular e escaneie o código
                </Typography>
                <Button
                  variant="outlined"
                  onClick={handleRefreshQR}
                  startIcon={<RefreshIcon />}
                  sx={{ mt: 1 }}
                >
                  Gerar novo QR
                </Button>
              </Box>
            )}
            {/* Status: Conectado */}
            {botStatus === 'connected' && (
              <Alert severity="success">Conectado com sucesso!</Alert>
            )}
            {/* Status: Parado (Renderiza botão apenas se NÃO houver QR) */}
            {botStatus === 'stopped' && !qrCode && (
              <Button onClick={handleStartBot} variant="contained">Iniciar Bot</Button>
            )}
            {/* Status: Erro */}
            {botStatus === 'error' && (
              <Alert severity="error">{error}</Alert>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
           <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Mensagem do Sistema</Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Defina como o bot deve se comportar.
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={8}
                label="Comportamento do Bot"
                value={bot?.systemMessage || ''}
                onChange={(e) => setBot({ ...bot, systemMessage: e.target.value })}
                sx={{ mb: 2 }}
                disabled={!bot || starting}
              />
              <Button variant="contained" onClick={handleSave} disabled={!bot || starting} startIcon={<SaveIcon />}>
                Salvar Mensagem
              </Button>
           </Paper>

           {connected && (
             <Paper sx={{ p: 3, mb: 3 }}>
               <Typography variant="h6" gutterBottom>Gerenciar Bloqueios</Typography>
               <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                 O bot ignorará mensagens destes números.
               </Typography>
               <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
                 <TextField
                   label="Número para bloquear (Ex: 258...)"
                   variant="outlined"
                   size="small"
                   value={numberToBlock}
                   onChange={(e) => setNumberToBlock(e.target.value)}
                   sx={{ flexGrow: 1 }}
                 />
                 <Button
                   variant="contained"
                   onClick={handleBlockNumber}
                   disabled={!numberToBlock}
                   size="small"
                 >
                   Bloquear
                 </Button>
               </Box>
               <Typography variant="subtitle2" gutterBottom>
                 Bloqueados: {blockedNumbers.length}
               </Typography>
               {blockedNumbers.length > 0 && (
                 <List dense sx={{ maxHeight: 150, overflow: 'auto', border: '1px solid #eee', borderRadius: 1 }}>
                   {blockedNumbers.map((number) => (
                     <ListItem
                       key={number}
                       secondaryAction={
                         <IconButton edge="end" size="small" aria-label="delete" onClick={() => handleUnblockNumber(number)}>
                           <DeleteIcon fontSize="small" />
                         </IconButton>
                       }
                       sx={{ py: 0 }}
                     >
                       <ListItemText primary={number} primaryTypographyProps={{ fontSize: '0.9rem' }} />
                     </ListItem>
                   ))}
                 </List>
               )}
             </Paper>
           )}

           {connected && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Estatísticas</Typography>
                <Grid container spacing={2}>
                   <Grid item xs={6} sm={4}>
                     <Card sx={{ textAlign: 'center' }}>
                       <CardContent sx={{ p: 1 }}>
                         <MessageIcon color="primary" sx={{ fontSize: 30, mb: 0.5 }} />
                         <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>{stats.messageCount}</Typography>
                         <Typography color="textSecondary" variant="caption">Mensagens</Typography>
                       </CardContent>
                     </Card>
                   </Grid>
                   <Grid item xs={6} sm={4}>
                     <Card sx={{ textAlign: 'center' }}>
                       <CardContent sx={{ p: 1 }}>
                         <TimerIcon color="secondary" sx={{ fontSize: 30, mb: 0.5 }} />
                         <Typography variant="caption" display="block">
                           {stats.lastActive ? new Date(stats.lastActive.toDate()).toLocaleTimeString() : '-'}
                         </Typography>
                         <Typography color="textSecondary" variant="caption">Última Atividade</Typography>
                       </CardContent>
                     </Card>
                   </Grid>
                </Grid>
              </Paper>
           )}
        </Grid>
      </Grid>
    </Container>
  );
});

export default BotConfig;