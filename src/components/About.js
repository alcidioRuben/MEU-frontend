import React from 'react';
import { Container, Paper, Typography, Divider, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import InfoIcon from '@mui/icons-material/Info';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';

function About() {
  return (
    <Container maxWidth="md">
      <Paper sx={{ p: { xs: 2, md: 4 }, mt: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Sobre o AMSync
        </Typography>
        
        <Typography variant="body1" paragraph>
          AMSync é uma empresa que oferece a criação e o gerenciamento de chatbots inteligentes para WhatsApp, 
          usando o poder da API OpenAI. Nossa missão é ajudar empresas a automatizar o atendimento, 
          responder instantaneamente e melhorar o engajamento com clientes.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" component="h2" gutterBottom>
          Como Funciona?
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <BuildIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Criação Fácil de Bots"
              secondary="Configure o comportamento do seu bot (regras, produtos, localização, etc.) através de uma interface web intuitiva."
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <InfoIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Inteligência Artificial"
              secondary="Utilizamos a API da OpenAI para gerar respostas mais naturais e inteligentes, adaptadas ao contexto da conversa."
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <ContactSupportIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Gerenciamento Centralizado"
              secondary="Monitore o status e as configurações de todos os seus bots em um único painel."
            />
          </ListItem>
        </List>

        <Divider sx={{ my: 3 }} />

        <Typography variant="body1" paragraph>
          Seja para responder perguntas frequentes, fornecer informações sobre produtos, ou simplesmente 
          manter um canal de comunicação aberto 24/7, o AMSync está aqui para ajudar sua empresa a 
          oferecer um atendimento mais eficiente.
        </Typography>

        {/* Pode adicionar informações de contato ou links aqui */}

      </Paper>
    </Container>
  );
}

export default About; 