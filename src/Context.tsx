import React, { createContext, useContext, useState } from 'react'
import { type Api, type TelegramClient } from 'telegram'
import { LoginState } from './util'

export interface TelegramContextData {
  user: Api.TypeUser | null
  setUser: any
  session: string | null
  setSession: any
  loginState: number
  setLoginState: any
  client: TelegramClient | null
  setClient: any
}

export const TelegramContext = createContext<TelegramContextData>({
  user: null,
  setUser: null,
  session: null,
  setSession: null,
  loginState: LoginState.Unknown,
  setLoginState: null,
  client: null,
  setClient: null
})

const TelegramProvider = ({ children }): React.JSX.Element => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loginState, setLoginState] = useState(LoginState.Unknown)
  const [client, setClient] = useState(null)
  return <TelegramContext.Provider value={{
    user,
    setUser,
    session,
    setSession,
    loginState,
    setLoginState,
    client,
    setClient
  }}>
    {children}
  </TelegramContext.Provider>
}

export default TelegramProvider
