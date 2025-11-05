import { useState } from 'react'
import './sidebar.css'

function Sidebar({ activeSection, onSectionChange }) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const menuItems = [
    { id: 'inicio', label: 'Inicio', icon: '🏠' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'productos', label: 'Productos', icon: '🍽️' },
    { id: 'categorias', label: 'Categorías', icon: '📂' },
    { id: 'pedidos', label: 'Pedidos', icon: '📋' },
    { id: 'compras', label: 'Compras', icon: '🛒' },
    { id: 'clientes', label: 'Clientes', icon: '👥' },
    { id: 'reportes', label: 'Reportes', icon: '📈' },
    { id: 'configuracion', label: 'Configuración', icon: '⚙️' }
  ]

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Header del sidebar */}
      <div className="sidebar-header">
        <div className="logo-container">
          <span className="logo-icon">🍴</span>
          {!isCollapsed && <h2 className="logo-text">RestauranteWeb</h2>}
        </div>
        <button 
          className="toggle-btn" 
          onClick={toggleSidebar}
          title={isCollapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          {isCollapsed ? '▶️' : '◀️'}
        </button>
      </div>

      {/* Navegación */}
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {menuItems.map((item) => (
            <li key={item.id} className="nav-item">
              <button
                className={`nav-link ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => onSectionChange(item.id)}
                title={isCollapsed ? item.label : ''}
              >
                <span className="nav-icon">{item.icon}</span>
                {!isCollapsed && <span className="nav-label">{item.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer del sidebar */}
      {!isCollapsed && (
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">👤</div>
            <div className="user-details">
              <span className="user-name">Admin</span>
              <span className="user-role">Administrador</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sidebar
