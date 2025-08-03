import './App.css'
import { MainChat } from '@/components/chat'
import { EchoProvider } from '@/contexts/echo'
import { Navbar } from '@/components/ui/navbar'

function App() {

  return (
    <div className="flex flex-col h-screen w-screen">
    <div className="flex h-0 flex-1 flex-col overflow-hidden">
      <EchoProvider>
        <Navbar />
        <MainChat />
      </EchoProvider>
    </div>
  </div>
  )
}

export default App
