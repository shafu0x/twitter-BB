import './App.css'
import { Chat } from '@/components/chat'

function App() {

  return (
    <div className="flex flex-col h-screen w-screen">
    <div className="flex h-0 flex-1 flex-col overflow-hidden bg-blue-500">
      <Chat />
    </div>
  </div>
  )
}

export default App
