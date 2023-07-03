import React, { useContext, useEffect, useState } from 'react'
import { TelegramClient, Api, password as Password } from 'telegram'
import { StringSession } from 'telegram/sessions'
import config from '../config'
import { getStoredSessionString, LoginState, useWindowDimensions } from './util'
import { Button } from './components/Controls'
import { BaseText, Desc, LinkText } from './components/Text'
import { InputBox, SmallTextGrey, WideLabel } from './Common'
import { Col, Row } from './components/Layout'
import styled from 'styled-components'
import { toast } from 'react-toastify'
import qrcode from 'qrcode'
import { Loading } from './components/Misc'
import { TelegramContext } from './Context'
import { useTryCatch } from './hooks/useTryCatch'
const LoginContainer = styled.div`
  max-width: 480px;
`

const QRCodeContainer = ({ children }): React.JSX.Element => {
  const { isMobile } = useWindowDimensions()
  return <Col style={{ width: isMobile ? 192 : 256, justifyContent: 'center' }}>
    <Row style={{ height: isMobile ? 192 : 256, justifyContent: 'center' }}>
      {children}
    </Row>
  </Col>
}

const QRCodeImage = styled.img`
  opacity: ${props => props.$expired ? 0.1 : 1};
  border: 1px solid lightgrey;
  border-radius: 8px;
  box-shadow: 0px 0px 10px lightgrey;
  width: 100%;
`

const Session = new StringSession(getStoredSessionString())
const Client = new TelegramClient(Session, config.tg.apiId, config.tg.apiHash, { connectionRetries: 5 })
const initialState = { phoneNumber: '', password: '', phoneCode: '' }

const Login: React.FC = () => {
  const { isMobile } = useWindowDimensions()
  const { setUser, setSession, setLoginState, setClient } = useContext(TelegramContext)
  const [{ phoneNumber, password, phoneCode }, setAuthInfo] = useState(initialState)
  const [currentLoginState, setCurrentLoginState] = useState(LoginState.LoginByQrCode)
  const [requirePassword, setRequirePassword] = useState(false)
  const [sendCodeResponse, setSendCodeResponse] = useState<{
    phoneCodeHash?: string
    isCodeViaApp?: boolean
  }>({})
  const [loginToken, setLoginToken] = useState<{ token?: Buffer, expires?: number }>({})
  const [qrCodeData, setQrCodeData] = useState<string>('')
  const [qrScanAccepted, setQrScanAccepted] = useState(false)
  const [qrCodeExpired, setQrCodeExpired] = useState(false)
  const { pending, initializing, tryCatch } = useTryCatch()

  useEffect(() => {
    async function getLoginToken (): Promise<number> {
      const result = await Client.invoke(
        new Api.auth.ExportLoginToken({
          apiId: config.tg.apiId,
          apiHash: config.tg.apiHash,
          exceptIds: []
        })
      )
      if (!(result instanceof Api.auth.LoginToken)) {
        toast.error('Cannot retrieve login QR code')
        return 0
      }
      const { token, expires } = result as { token?: Buffer, expires?: number }

      if (!token || !expires) {
        toast.error('Invalid QR code response from Telegram')
        return 0
      }
      setLoginToken({ token, expires })
      return expires
    }
    tryCatch(async () => {
      await Client.connect()
      setClient(Client)
      const authed = await Client.isUserAuthorized()
      if (authed) {
        setCurrentLoginState(LoginState.Done)
        setLoginState(LoginState.Done)
        setSession((Client.session as StringSession).save())
        const user = await Client.getMe()
        setUser(user)
        return
      }
      const expires = await getLoginToken()
      setTimeout(() => { setQrCodeExpired(true) }, Math.max(0, expires * 1000 - Date.now()))
    }, true, 'Cannot retrieve login QR code').catch(console.error)
    Client.addEventHandler((update: Api.TypeUpdate) => {
      if (update instanceof Api.UpdateLoginToken) {
        setQrScanAccepted(true)
      }
    })
  }, [tryCatch, setClient, setSession, setUser, setLoginState])

  useEffect(() => {
    async function renderQrCode (): Promise<void> {
      if (!loginToken.token) {
        return
      }
      const encodedToken = loginToken.token.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const uri = `tg://login?token=${encodedToken}`

      const dataUrl = await qrcode.toDataURL(uri, { errorCorrectionLevel: 'low', width: isMobile ? 192 : 256 })
      setQrCodeData(dataUrl)
    }
    renderQrCode().catch(console.error)
  }, [loginToken, isMobile])

  useEffect(() => {
    async function onQrScanAccepted (): Promise<void> {
      if (!qrScanAccepted) {
        return
      }
      try {
        const r = await Client.invoke(
          new Api.auth.ExportLoginToken({
            apiId: config.tg.apiId,
            apiHash: config.tg.apiHash,
            exceptIds: []
          })
        )
        if (
          r instanceof Api.auth.LoginTokenSuccess &&
            r.authorization instanceof Api.auth.Authorization
        ) {
          toast.success('Login Successful')
          setUser(r.authorization.user)
        } else if (r instanceof Api.auth.LoginTokenMigrateTo) {
          await Client._switchDC(r.dcId)
          const mr = await Client.invoke(
            new Api.auth.ImportLoginToken({ token: r.token })
          )
          if (
            mr instanceof Api.auth.LoginTokenSuccess &&
              mr.authorization instanceof Api.auth.Authorization
          ) {
            toast.success('Login Successful')
            setUser(mr.authorization.user)
          } else {
            console.log(mr)
            toast.error('Unexpected error during login. Please refresh and try again')
          }
        } else {
          console.log(r)
          toast.error('Login with QR code failed')
        }
      } catch (ex: any) {
        if (ex.errorMessage === 'SESSION_PASSWORD_NEEDED') {
          setRequirePassword(true)
          setCurrentLoginState(LoginState.VerifyPassword)
          setLoginState(LoginState.VerifyPassword)
        } else {
          console.error(ex)
          toast.error(`Error during QR Code sign in: ${ex.toString()}`)
        }
      }
    }
    tryCatch(async () => {
      await onQrScanAccepted()
    }).catch(console.error)
  }, [tryCatch, setLoginState, setUser, qrScanAccepted])

  async function requestLoginCode (): Promise<void> {
    tryCatch(async () => {
      setSendCodeResponse(await Client.sendCode(
        {
          apiId: config.tg.apiId,
          apiHash: config.tg.apiHash
        },
        phoneNumber
      ))
      setCurrentLoginState(LoginState.VerifyCode)
      setLoginState(LoginState.VerifyCode)
    }).catch(console.error)
  }

  async function verifyPassword (): Promise<void> {
    tryCatch(async () => {
      const passwordData = await Client.invoke(
        new Api.account.GetPassword()
      )
      const passwordSrpCheck = await Password.computeCheck(
        passwordData,
        password
      )
      const { user } = (await Client.invoke(
        new Api.auth.CheckPassword({ password: passwordSrpCheck })
      )) as Api.auth.Authorization
      setUser(user)
      const session = (Client.session as StringSession).save()
      localStorage.setItem('dc-chat-session', session) // Save session to local storage
      setSession(session)
      setCurrentLoginState(LoginState.Done)
      setLoginState(LoginState.Done)
    }, false, 'Failed to verify 2FA password').catch(console.error)
  }

  async function submitLoginCode (): Promise<void> {
    if (requirePassword && !password) {
      setCurrentLoginState(LoginState.VerifyPassword)
      setLoginState(LoginState.VerifyPassword)
      return
    }
    tryCatch(async () => {
      try {
        const result = await Client.invoke(new Api.auth.SignIn({ phoneNumber, phoneCodeHash: sendCodeResponse.phoneCodeHash, phoneCode }))
        if (result instanceof Api.auth.AuthorizationSignUpRequired) {
          toast.error('You have not signed up at Telegram')
          return
        }
        // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
        const session = Client.session.save() as unknown as string
        localStorage.setItem('dc-chat-session', session) // Save session to local storage
        setCurrentLoginState(LoginState.Done)
        setLoginState(LoginState.Done)
      } catch (ex: any) {
        if (ex.errorMessage === 'SESSION_PASSWORD_NEEDED') {
          setRequirePassword(true)
          setCurrentLoginState(LoginState.VerifyPassword)
          setLoginState(LoginState.VerifyPassword)
        } else {
          throw ex
        }
      }
    }, false, 'Error during sign-in').catch(console.error)
  }

  function updateInput ({ target: { name, value } }): void {
    setAuthInfo((authInfo) => ({ ...authInfo, [name]: value }))
  }

  if (currentLoginState === LoginState.Done) {
    return <></>
  }

  return (<LoginContainer>
    <Desc style={{ marginBottom: 36 }}>
      <SmallTextGrey>Using your Telegram account</SmallTextGrey>
    </Desc>
    {currentLoginState === LoginState.LoginByQrCode && <Desc>
      {!qrCodeData && <QRCodeContainer>
        <Loading size={48}/>
        </QRCodeContainer>}
      {qrCodeData &&
      <QRCodeContainer>
        <QRCodeImage src={qrCodeData} $expired={qrCodeExpired}/>
        {qrCodeExpired && <BaseText style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>Code Expired</BaseText>}
      </QRCodeContainer>}
      <SmallTextGrey>Login by scanning the QR Code on Telegram</SmallTextGrey>
      <LinkText style={{ color: 'blue', marginTop: 32 }} onClick={() => { setCurrentLoginState(LoginState.LoginByPhone) }}>or use phone number instead</LinkText>
    </Desc>}
    {currentLoginState === LoginState.LoginByPhone && <Desc>
      <Row>
        <WideLabel>Phone</WideLabel>
        <InputBox $width={'100%'} name={'phoneNumber'} value={phoneNumber} placeholder={'+16501234...'} onChange={updateInput}/>
      </Row>
      <Button disabled={pending || initializing} onClick={requestLoginCode}>Login</Button>
    </Desc>}
    {currentLoginState === LoginState.VerifyCode && <Desc>
      <SmallTextGrey>Your login code was just sent to {sendCodeResponse.isCodeViaApp ? 'Telegram app' : 'phone via SMS'}</SmallTextGrey>
      <Row>
        <WideLabel>Code</WideLabel>
        <InputBox $width={'100%'} name='phoneCode' value={phoneCode} onChange={updateInput}/>
      </Row>
      <Button disabled={pending || initializing} onClick={submitLoginCode}>Submit</Button>
      </Desc>}
    {currentLoginState === LoginState.VerifyPassword && <Desc>
      <SmallTextGrey>You have 2FA enabled. Please provide your 2FA password</SmallTextGrey>
      <Row>
        <WideLabel>Password</WideLabel>
        <InputBox name="password" type={'password'} $width={'100%'} value={password} onChange={updateInput}/>
      </Row>
      <Button disabled={pending || initializing} onClick={verifyPassword}>Verify</Button>
    </Desc>}
  </LoginContainer>
  )
}

export default Login
