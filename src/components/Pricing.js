import React, { useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Box,
  IconButton,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import MessageIcon from '@mui/icons-material/Message';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const pricingTiers = [
  {
    title: 'Essencial',
    price: '200 MT',
    messages: '1.000 Mensagens/mês',
    features: [
      'Resposta automática com IA',
      'Configuração via Painel Web',
      'Histórico básico de conversas'
    ],
  },
  {
    title: 'Crescimento',
    price: '360 MT',
    messages: '2.000 Mensagens/mês',
    features: [
      'Tudo do Essencial',
      'Gerenciamento de bloqueios',
      'Suporte prioritário por email'
    ],
  },
  {
    title: 'Profissional',
    price: '1800 MT',
    messages: '10.000 Mensagens/mês',
    features: [
      'Tudo do Crescimento',
      'Múltiplos usuários autorizados',
      'API para integrações (em breve)'
    ],
  },
   {
    title: 'Ilimitado',
    price: '2500 MT',
    messages: 'Mensagens Ilimitadas',
    icon: <AllInclusiveIcon color="primary"/>,
    features: [
      'Tudo do Profissional',
      'Mensagens ilimitadas',
      'Suporte dedicado por WhatsApp'
    ],
  },
];

function Pricing() {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleCopy = (textToCopy, type) => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      setSnackbarMessage(`${type} copiado: ${textToCopy}`);
      setSnackbarOpen(true);
    }, (err) => {
      console.error('Erro ao copiar: ', err);
      setSnackbarMessage('Falha ao copiar número.');
      setSnackbarOpen(true);
    });
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold', mb: 4 }}>
        Planos e Preços
      </Typography>
      <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 6 }}>
        Escolha o plano ideal para automatizar o atendimento da sua empresa com inteligência artificial.
      </Typography>
      <Grid container spacing={4} alignItems="stretch">
        {pricingTiers.map((tier) => (
          <Grid item key={tier.title} xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardHeader
                title={tier.title}
                subheader={tier.price}
                titleTypographyProps={{ align: 'center', variant: 'h5', fontWeight: 'medium' }}
                subheaderTypographyProps={{
                  align: 'center',
                  variant: 'h6',
                  color: 'primary.main',
                  fontWeight: 'bold'
                }}
                sx={{ backgroundColor: (theme) => theme.palette.mode === 'light' ? theme.palette.grey[200] : theme.palette.grey[700] }}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', mb: 2 }}>
                  {tier.icon ? tier.icon : <MessageIcon color="action"/>}
                  <Typography component="span" variant="subtitle1" color="text.secondary" sx={{ml: 1}}>
                    {tier.messages}
                  </Typography>
                </Box>
                <List dense>
                  {tier.features.map((line) => (
                    <ListItem key={line} disableGutters>
                      <ListItemIcon sx={{minWidth: '30px'}}>
                        <CheckIcon fontSize="small" color="success" />
                      </ListItemIcon>
                      <ListItemText primary={line} primaryTypographyProps={{ variant: 'body2' }} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: { xs: 2, md: 4 }, mt: 6, backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100' }}>
        <Typography variant="h5" component="h2" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
          Instruções de Pagamento
        </Typography>
        <Typography variant="body1" align="center" paragraph sx={{ mb: 3 }}>
          Para ativar seu plano ou adicionar mais mensagens, realize o pagamento para um dos números abaixo.
          Sua conta será atualizada automaticamente em poucos minutos após a confirmação.
        </Typography>
        
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={12} sm={6} md={5} sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>M-Pesa</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body1" sx={{ mr: 1 }}>258841006962</Typography>
              <Tooltip title="Copiar Número">
                <IconButton size="small" onClick={() => handleCopy('841006962', 'M-Pesa')}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={5} sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>E-Mola</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body1" sx={{ mr: 1 }}>258874006962</Typography>
               <Tooltip title="Copiar Número">
                 <IconButton size="small" onClick={() => handleCopy('874006962', 'E-Mola')}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
               </Tooltip>
            </Box>
          </Grid>
          <Grid item xs={12} sx={{ textAlign: 'center', mt: 1 }}>
            <Typography variant="subtitle1">Nome: Alcidio Ruben Macuacua</Typography>
          </Grid>
        </Grid>
      </Paper>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarMessage.includes('Falha') ? "error" : "success"} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

    </Container>
  );
}

export default Pricing; 