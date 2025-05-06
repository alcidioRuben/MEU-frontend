import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  DialogContentText
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  WhatsApp as WhatsAppIcon,
  CheckCircleOutline as CheckIcon,
  ErrorOutline as ErrorIcon,
  HourglassEmpty as HourglassIcon,
  PowerOff as PowerOffIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import config from '../config';

// Valores padrão para o formulário
const defaultValues = {
  name: '',
  description: 'Olá! Sou o assistente virtual da [Nome da Empresa], estou aqui para ajudar você. 😊',
  rules: '- Regra 1\n- Regra 2',
  products: '- Produto 1\n- Serviço A',
  location: 'Endereço completo aqui',
  orderInstructions: 'Instruções para pedido',
  contactInfo: 'Informações de contato (Telefone, Email, etc.)'
};

function Dashboard() {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  // Estado para todos os campos do formulário
  const [newBotData, setNewBotData] = useState(defaultValues);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadBots();
  }, [currentUser]);

  async function loadBots() {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const q = query(
        collection(db, 'bots'),
        where('userId', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const botsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBots(botsList);
    } catch (error) {
      console.error('Erro ao carregar bots:', error);
      setError('Falha ao carregar bots. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  // Handler para atualizar o estado do formulário
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Atualiza a descrição padrão se o nome mudar
    if (name === 'name') {
      setNewBotData(prev => ({
        ...prev,
        [name]: value,
        description: defaultValues.description.replace('[Nome da Empresa]', value || 'sua empresa')
      }));
    } else {
      setNewBotData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Função para fechar o diálogo e resetar o formulário
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewBotData(defaultValues); // Reseta para os valores padrão
    setError(''); // Limpa erros do diálogo
  };

  async function handleCreateBot() {
    if (!newBotData.name.trim()) {
      setError('O nome do bot não pode estar vazio.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // Verificar quantos bots o usuário já possui
      const botsCollection = collection(db, 'bots');
      const q = query(botsCollection, where('userId', '==', currentUser.uid));
      const userBotsSnapshot = await getDocs(q);
      const userBotCount = userBotsSnapshot.size;

      console.log(`Usuário ${currentUser.uid} possui ${userBotCount} bot(s)`);

      const botId = newBotData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      // Construir a systemMessage
      const systemMessage = `Tu és um atendente da ${newBotData.name}. ${newBotData.description}

REGRAS DE ATENDIMENTO:
${newBotData.rules}

PRODUTOS/SERVIÇOS:
${newBotData.products}

LOCALIZAÇÃO:
${newBotData.location}

FORMA DE PEDIDO:
${newBotData.orderInstructions}

CONTATO:
${newBotData.contactInfo}`;

      // Definir o limite inicial de mensagens
      const initialMessageLimit = userBotCount === 0 ? 50 : 0;

      const botPayload = {
        id: botId,
        name: newBotData.name,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        status: 'stopped', // Bot começa parado
        messageCount: 0,
        totalCost: 0,
        messageLimit: initialMessageLimit, // Adiciona o limite inicial
        systemMessage: systemMessage, // Salva a mensagem construída
        // Adicione outros campos se necessário (como whatsappNumber, messageLimit etc.)
        // whatsappNumber: '', // Exemplo: Adicionar se coletado no form
        // messageLimit: 0, // Exemplo: Adicionar se coletado no form
      };

      // Salvar no Firestore
      await setDoc(doc(db, 'bots', botId), botPayload);
      console.log(`Novo bot criado no Firestore com ID: ${botId} para usuário ${currentUser.uid}`);

      await loadBots(); // Recarrega a lista de bots
      handleCloseDialog(); // Fecha o diálogo e reseta o form
      
      // Navega para a página de configuração do novo bot
      navigate(`/bot/${botId}`);

    } catch (error) {
      console.error('Erro ao criar bot:', error);
      setError('Falha ao criar o bot. Verifique se o nome já existe ou tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteBot(botId) {
    if (!window.confirm('Tem certeza que deseja excluir este bot?')) {
      return;
    }

    const token = localStorage.getItem('idToken');
    if (!token) {
      console.error('Token não encontrado para excluir o bot');
      return;
    }

    try {
      // 1. Tentar parar o bot no backend (ignorar erros se já estiver parado)
      console.log(`Tentando parar o bot ${botId} antes de excluir...`);
      // Corrigindo a busca pelo documento pelo campo 'id' que você definiu
      const botQuery = query(collection(db, 'bots'), where('id', '==', botId), where('userId', '==', currentUser.uid));
      const botSnapshot = await getDocs(botQuery);

      if (botSnapshot.empty) {
        console.log(`Bot com id ${botId} não encontrado no Firestore para este usuário.`);
        // Mesmo que não ache no firestore, tenta parar no backend pelo ID, pode existir lá
      }

      const stopResponse = await fetch(`${config.apiUrl}/api/bots/${botId}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!stopResponse.ok && stopResponse.status !== 404) {
        // Loga o erro mas continua, a exclusão do firestore é mais importante
        console.warn(`Falha ao parar o bot ${botId} no backend (status ${stopResponse.status}). Continuando com a exclusão...`);
      } else {
        console.log(`Comando de parada enviado/processado para ${botId}.`);
      }

      // 2. Excluir do Firestore usando o ID do documento (se encontrado)
      if (!botSnapshot.empty) {
        const docIdToDelete = botSnapshot.docs[0].id;
        console.log(`Excluindo bot ${botId} (doc ID: ${docIdToDelete}) do Firestore...`);
        await deleteDoc(doc(db, 'bots', docIdToDelete));
      } else {
        console.log(`Não foi possível encontrar o documento do bot ${botId} para excluir do Firestore.`);
      }

      // 3. Atualizar UI
      setBots(prevBots => prevBots.filter(bot => bot.id !== botId));
      console.log(`Bot ${botId} removido da UI.`);

    } catch (error) {
      console.error('Erro ao excluir bot:', error);
      alert('Erro ao excluir o bot. Por favor, tente novamente.');
    }
  }

  const getStatusChip = (status) => {
    const statusConfig = {
      connected: { color: 'success', icon: <CheckIcon />, label: 'Conectado' },
      disconnected: { color: 'warning', icon: <ErrorIcon />, label: 'Desconectado' },
      starting: { color: 'info', icon: <HourglassIcon />, label: 'Iniciando' },
      stopped: { color: 'default', icon: <PowerOffIcon />, label: 'Parado' },
      qr_received: { color: 'info', icon: <WhatsAppIcon />, label: 'Aguardando Scan' }, // Novo status
      error: { color: 'error', icon: <ErrorIcon />, label: 'Erro' }
    };
    
    // Garante que status desconhecidos resultem em 'Parado'
    const config = statusConfig[status] || statusConfig.stopped;
    
    return (
      <Chip 
        size="small"
        icon={config.icon}
        label={config.label}
        color={config.color}
        sx={{ fontWeight: 500, minWidth: 110, justifyContent: 'flex-start' }} 
      />
    );
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Meus Bots
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)} // Apenas abre o diálogo
          sx={{ py: 1, px: 2 }}
        >
          Novo Bot
        </Button>
      </Box>

      {loading && bots.length === 0 && ( // Mostrar loading apenas na carga inicial
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}

      {!loading && bots.length === 0 && !error && ( // Mostrar mensagem se não estiver carregando, sem bots e sem erro
        <Typography sx={{ textAlign: 'center', mt: 5, color: 'text.secondary' }}>
          Você ainda não criou nenhum bot. Clique em "Novo Bot" para começar.
        </Typography>
      )}

      {!loading && bots.length > 0 && (
        <Grid container spacing={3}>
          {bots.map((bot) => (
            <Grid item xs={12} sm={6} md={4} key={bot.id}>
              <Card sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                },
                borderRadius: 2
              }}>
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: 'primary.light' }}>
                        <WhatsAppIcon />
                      </Avatar>
                      <Typography variant="h6" component="h2" sx={{ fontWeight: 500 }}>
                        {bot.name}
                      </Typography>
                    </Box>
                    {getStatusChip(bot.status)}
                  </Box>
                  
                  <Box sx={{ mb: 2, mt: 1, color: 'text.secondary' }}>
                    <Typography variant="body2">
                      Mensagens: {bot.messageCount || 0}
                    </Typography>
                    <Typography variant="body2">
                      Última atividade: {bot.lastActive ? new Date(bot.lastActive.toDate()).toLocaleString() : '-'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => navigate(`/bot/${bot.id}`)}
                    >
                      Configurar
                    </Button>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteBot(bot.id)} // Passa o ID correto
                      title="Excluir"
                      disabled={loading} // Desabilita durante operações
                    >
                     {loading ? <CircularProgress size={16} /> : <DeleteIcon />}
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Diálogo de Criação/Configuração */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Criar Novo Bot</DialogTitle>
        <DialogContent>
           <DialogContentText sx={{mb: 2}}>
             Configure as informações iniciais do seu bot. Você poderá editá-las depois.
           </DialogContentText>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12}>
          <TextField
            autoFocus
                required
            margin="dense"
                id="name"
                name="name" // Adicionado name
            label="Nome do Bot"
            type="text"
            fullWidth
                variant="outlined" // Mudado para outlined
                value={newBotData.name}
                onChange={handleInputChange}
                helperText="Nome da sua empresa ou identificador do bot."
              />
            </Grid>
            <Grid item xs={12}>
               <TextField
                 margin="dense"
                 id="description"
                 name="description" // Adicionado name
                 label="Descrição / Saudação Inicial"
                 type="text"
                 fullWidth
                 multiline
                 rows={3}
                 variant="outlined"
                 value={newBotData.description}
                 onChange={handleInputChange}
                 helperText="Como o bot deve se apresentar e descrever o negócio."
               />
             </Grid>
             <Grid item xs={12} sm={6}>
               <TextField
                 margin="dense"
                 id="rules"
                 name="rules" // Adicionado name
                 label="Regras de Atendimento"
                 type="text"
                 fullWidth
                 multiline
                 rows={4}
                 variant="outlined"
                 value={newBotData.rules}
                 onChange={handleInputChange}
                 helperText="Liste as regras de atendimento, uma por linha."
               />
             </Grid>
             <Grid item xs={12} sm={6}>
               <TextField
                 margin="dense"
                 id="products"
                 name="products" // Adicionado name
                 label="Produtos / Serviços"
                 type="text"
                 fullWidth
                 multiline
                 rows={4}
                 variant="outlined"
                 value={newBotData.products}
                 onChange={handleInputChange}
                 helperText="Liste os produtos ou serviços, um por linha."
               />
             </Grid>
             <Grid item xs={12}>
               <TextField
                 margin="dense"
                 id="location"
                 name="location" // Adicionado name
                 label="Localização"
                 type="text"
                 fullWidth
                 variant="outlined"
                 value={newBotData.location}
                 onChange={handleInputChange}
                 helperText="Endereço físico ou área de atuação."
               />
             </Grid>
              <Grid item xs={12} sm={6}>
               <TextField
                 margin="dense"
                 id="orderInstructions"
                 name="orderInstructions" // Adicionado name
                 label="Forma de Pedido"
                 type="text"
                 fullWidth
                 multiline
                 rows={3}
                 variant="outlined"
                 value={newBotData.orderInstructions}
                 onChange={handleInputChange}
                 helperText="Instruções sobre como fazer um pedido."
               />
             </Grid>
             <Grid item xs={12} sm={6}>
               <TextField
                 margin="dense"
                 id="contactInfo"
                 name="contactInfo" // Adicionado name
                 label="Informações de Contato"
                 type="text"
                 fullWidth
                 multiline
                 rows={3}
                 variant="outlined"
                 value={newBotData.contactInfo}
                 onChange={handleInputChange}
                 helperText="Outros meios de contato (telefone, email, etc.)."
               />
             </Grid>
           </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleCreateBot} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Criar e Salvar Bot'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Dashboard; 