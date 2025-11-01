import { useState } from 'react'
import Sidebar from '../componentes/sidebar'
import Productos from '../pantallas/productos'
import './Layout.css'

function Layout() {
  const [activeSection, setActiveSection] = useState('productos')

  const renderContent = () => {
    switch (activeSection) {
      case 'inicio':
        return (
          <div className="content-section">
            <h1>🏠 Bienvenido al Dashboard</h1>
            <div className="welcome-content">
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Productos Activos</h3>
                  <p className="stat-number">124</p>
                </div>
                <div className="stat-card">
                  <h3>Pedidos Hoy</h3>
                  <p className="stat-number">18</p>
                </div>
                <div className="stat-card">
                  <h3>Ventas del Mes</h3>
                  <p className="stat-number">$12,450</p>
                </div>
                <div className="stat-card">
                  <h3>Clientes Registrados</h3>
                  <p className="stat-number">89</p>
                </div>
              </div>
            </div>
          </div>
        )
      case 'productos':
        return <Productos />
      case 'categorias':
        return (
          <div className="content-section">
            <h1>📂 Gestión de Categorías</h1>
            <p>Aquí puedes gestionar las categorías de productos...</p>
          </div>
        )
      case 'pedidos':
        return (
          <div className="content-section">
            <h1>📋 Gestión de Pedidos</h1>
            <p>Aquí puedes ver y gestionar los pedidos...</p>
          </div>
        )
      case 'clientes':
        return (
          <div className="content-section">
            <h1>👥 Gestión de Clientes</h1>
            <p>Aquí puedes gestionar la información de clientes...</p>
          </div>
        )
      case 'reportes':
        return (
          <div className="content-section">
            <h1>📊 Reportes y Estadísticas</h1>
            <p>Aquí puedes ver reportes y estadísticas...</p>
          </div>
        )
      case 'configuracion':
        return (
          <div className="content-section">
            <h1>⚙️ Configuración</h1>
            <p>Aquí puedes ajustar la configuración del sistema...</p>
          </div>
        )
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