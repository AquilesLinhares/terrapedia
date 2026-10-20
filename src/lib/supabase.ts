// Conexão com o Supabase (login e sincronização da biblioteca).
//
// O endereço e a chave pública vêm do arquivo .env (veja .env.example). A chave pública pode
// ficar no navegador: quem protege os dados são as regras de RLS no banco. Sem o .env o app
// continua funcionando, só que sem login (tudo fica no aparelho).

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = url && key ? createClient(url, key) : null
