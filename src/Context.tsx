import React, { createContext, useContext, useState } from 'react'

export interface TelegramContextData {
  user: any
  setUser: any
  session: any
  setSession: any
  loginState: any
  setLoginState: any
  client: any
  setClient: any
}

export const TelegramContext = createContext<TelegramContextData>({
  user: null,
  setUser: null,
  session: null,
  setSession: null,
  loginState: null,
  setLoginState: null,
  client: null,
  setClient: null
})

const TelegramProvider = (): React.JSX.Element => {
  const [user, setUser] = useState()
  const [session, setSession] = useState()
  const [loginState, setLoginState] = useState()
  const [client, setClient] = useState()
  return <TelegramContext.Provider value={{
    user,
    setUser,
    session,
    setSession,
    loginState,
    setLoginState,
    client,
    setClient
  }}/>
}

export default TelegramProvider
