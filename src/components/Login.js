import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  CircularProgress,
  Divider,
  IconButton
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== '/login') {
      const fromPath = location.state?.from || '/';
      sessionStorage.setItem('redirectAfterLogin', fromPath);
      console.log('Login: salvando URL para redirecionamento após login:', fromPath);
    }
  }, [location]);

  const handleEmailPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setGoogleLoading(false);

    try {
      await login(email, password);
      console.log('Login com Firebase Auth (Email/Senha) bem-sucedido.');
      
      const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/';
      console.log('Redirecionando após login para:', redirectPath);
      sessionStorage.removeItem('redirectAfterLogin');
      navigate(redirectPath, { replace: true });

    } catch (error) {
      console.error('Erro ao fazer login com Email/Senha:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setError('Email ou senha inválidos.');
      } else {
        setError(error.message || 'Erro desconhecido ao fazer login.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    setLoading(false);
    try {
      await loginWithGoogle();
      const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/';
      console.log('Redirecionando após login com Google para:', redirectPath);
      sessionStorage.removeItem('redirectAfterLogin');
      navigate(redirectPath, { replace: true });
    } catch (error) {
      console.error('Erro no login com Google:', error);
      
      if (error.code === 'auth/operation-not-allowed') {
        setError('Login com Google não está habilitado. É necessário ativar o provedor Google no console do Firebase.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        setError('Janela de login foi fechada. Tente novamente.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.log('Solicitação de popup cancelada pelo usuário');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        setError(error.message || 'Falha ao fazer login com Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Login
        </Typography>
        {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}
        <Box component="form" onSubmit={handleEmailPasswordSubmit} sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || googleLoading}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Senha"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading || googleLoading}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading || googleLoading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Entrar'}
          </Button>
          <Divider sx={{ width: '100%', my: 2 }}>OU</Divider>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            sx={{ 
              mb: 2,
              py: 1,
              border: '1px solid #ddd',
              color: 'rgba(0, 0, 0, 0.87)',
              backgroundColor: '#fff',
              '&:hover': {
                backgroundColor: '#f5f5f5',
                border: '1px solid #ccc'
              }
            }}
          >
            {googleLoading ? 
              <CircularProgress size={24} color="inherit" /> : 
              'Entrar com Google'
            }
          </Button>
          {error && error.includes('não está habilitado') && (
            <Alert severity="info" sx={{ mb: 2, width: '100%' }}>
              <Typography variant="body2">
                Para habilitar o login com Google:
                <ol style={{ margin: '0.5rem 0 0 1rem', paddingLeft: 0 }}>
                  <li>Acesse o <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer">Console do Firebase</a></li>
                  <li>Selecione seu projeto</li>
                  <li>Vá em "Authentication" → "Sign-in method"</li>
                  <li>Habilite o provedor "Google"</li>
                </ol>
              </Typography>
            </Alert>
          )}
          <Box sx={{ textAlign: 'center' }}>
            <Link component={RouterLink} to="/register" variant="body2">
              {"Não tem uma conta? Cadastre-se"}
            </Link>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}

export default Login; 