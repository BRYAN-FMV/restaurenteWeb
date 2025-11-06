import { useState } from 'react'
import Sidebar from '../componentes/sidebar'
import Productos from '../pantallas/productos'
import Pedidos from '../pantallas/pedido'
import Dashboard from '../pantallas/dashboard'
import Compras from '../pantallas/compras'
import './Layout.css'

function Layout() {
  const [activeSection, setActiveSection] = useState('productos')

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />
      case 'productos':
        return <Productos />
      case 'pedidos':
        return <Pedidos />
      case 'compras':
        return <Compras />
      default:
        return <Productos />
    }
  }

  return (
    <div className="layout">
      <Sidebar 
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  )
}

export default Layout