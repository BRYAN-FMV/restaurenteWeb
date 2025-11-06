import { useState } from 'react'
import useFetch from '../hooks/usefetch'
import { getApiUrl } from '../config/api.js'
import './compras.css'

const Compras = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  const { data: compras, loading: loadingCompras, error: errorCompras } = useFetch(`${getApiUrl('/api/compras')}?refresh=${refreshKey}`)
  
  // Estados para el formulario
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    producto: '',
    cantidad: '',
    precio: ''
  })
  
  // Estados para filtros
  const [filtroFecha, setFiltroFecha] = useState('hoy')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const reloadData = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validaciones más estrictas
    const producto = formData.producto.trim()
    const cantidad = parseInt(formData.cantidad)
    const precio = parseFloat(formData.precio)

    if (!producto) {
      alert('❌ Por favor ingresa el nombre del producto')
      return
    }

    if (!cantidad || cantidad <= 0) {
      alert('❌ La cantidad debe ser mayor a 0')
      return
    }

    if (!precio || precio <= 0) {
      alert('❌ El precio debe ser mayor a 0')
      return
    }

    try {
      const dataToSend = {
        producto: producto,
        cantidad: cantidad,
        precio: precio
      }

      console.log('Enviando datos:', dataToSend)

      const response = await fetch(getApiUrl('/api/compras'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend)
      })

      console.log('Respuesta del servidor:', response.status, response.statusText)

      if (response.ok) {
        const result = await response.json()
        console.log('Compra creada:', result)
        alert('✅ Compra registrada exitosamente')
        setShowModal(false)
        setFormData({ producto: '', cantidad: '', precio: '' })
        reloadData()
      } else {
        const errorData = await response.text()
        console.error('Error del servidor:', errorData)
        alert(`❌ Error al registrar la compra: ${response.status}\n${errorData}`)
      }
    } catch (error) {
      console.error('Error de conexión:', error)
      alert('❌ Error de conexión: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta compra?')) {
      try {
        const response = await fetch(getApiUrl(`/api/compras/${id}`), {
          method: 'DELETE'
        })

        if (response.ok) {
          alert('✅ Compra eliminada exitosamente')
          reloadData()
        } else {
          alert('❌ Error al eliminar la compra')
        }
      } catch (error) {
        console.error('Error:', error)
        alert('❌ Error de conexión')
      }
    }
  }

  // Filtrar compras por fecha y búsqueda
  const filtrarComprasPorFecha = (compras) => {
    if (!compras) return []
    
    const hoy = new Date()
    hoy.setHours(23, 59, 59, 999)
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
    
    const inicioSemana = new Date(hoy)
    inicioSemana.setDate(hoy.getDate() - hoy.getDay())
    inicioSemana.setHours(0, 0, 0, 0)
    
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    
    return compras.filter(compra => {
      const fechaCompra = new Date(compra.fecha)
      
      // Filtro por búsqueda
      const coincideBusqueda = !searchTerm || 
        compra.producto.toLowerCase().includes(searchTerm.toLowerCase())
      
      if (!coincideBusqueda) return false
      
      // Filtro por tiempo
      switch (filtroFecha) {
        case 'hoy':
          return fechaCompra >= inicioHoy && fechaCompra <= hoy
        case 'semana':
          return fechaCompra >= inicioSemana && fechaCompra <= hoy
        case 'mes':
          return fechaCompra >= inicioMes && fechaCompra <= hoy
        case 'personalizado':
          if (fechaInicio && fechaFin) {
            const inicio = new Date(fechaInicio)
            const fin = new Date(fechaFin)
            fin.setHours(23, 59, 59, 999)
            return fechaCompra >= inicio && fechaCompra <= fin
          }
          return true
        case 'todo':
        default:
          return true
      }
    })
  }

  const comprasFiltradas = filtrarComprasPorFecha(compras)
  const totalCompras = comprasFiltradas?.reduce((total, compra) => total + (compra.cantidad * compra.precio), 0) || 0

  const obtenerTextoFiltro = () => {
    switch (filtroFecha) {
      case 'hoy': return 'Hoy'
      case 'semana': return 'Esta semana'
      case 'mes': return 'Este mes'
      case 'personalizado': 
        if (fechaInicio && fechaFin) {
          return `${new Date(fechaInicio).toLocaleDateString('es-ES')} - ${new Date(fechaFin).toLocaleDateString('es-ES')}`
        }
        return 'Período personalizado'
      case 'todo': return 'Todas las compras'
      default: return 'Período seleccionado'
    }
  }

  return (
    <div className="compras-container">
      {/* Header */}
      <div className="compras-header">
        <h1>🛒 Gestión de Compras - COMEDOR FLORES</h1>
        <div className="header-actions">
          <button onClick={reloadData} className="btn-refresh">
            🔄 Actualizar
          </button>
          <button 
            onClick={() => setShowModal(true)} 
            className="btn-add-compra"
          >
            ➕ Nueva Compra
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="compras-filters">
        <div className="filter-group">
          <label>🔍 Buscar producto:</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre de producto..."
            className="filter-input search-input"
          />
        </div>

        <div className="filter-group">
          <label>Período:</label>
          <select 
            value={filtroFecha} 
            onChange={(e) => setFiltroFecha(e.target.value)}
            className="filter-select"
          >
            <option value="hoy">Hoy</option>
            <option value="semana">Esta semana</option>
            <option value="mes">Este mes</option>
            <option value="personalizado">Período personalizado</option>
            <option value="todo">Todas las compras</option>
          </select>
        </div>

        {filtroFecha === 'personalizado' && (
          <div className="date-range">
            <div className="filter-group">
              <label>Desde:</label>
              <input 
                type="date" 
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="filter-input"
              />
            </div>
            <div className="filter-group">
              <label>Hasta:</label>
              <input 
                type="date" 
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="filter-input"
              />
            </div>
          </div>
        )}

        {searchTerm && (
          <div className="search-info">
            <span className="search-results">
              🔍 Mostrando resultados para: "<strong>{searchTerm}</strong>"
            </span>
            <button 
              onClick={() => setSearchTerm('')}
              className="btn-clear-search"
              title="Limpiar búsqueda"
            >
              ✖️
            </button>
          </div>
        )}
      </div>

      {/* Resumen */}
      <div className="compras-summary">
        <h2>📊 Resumen de Compras: {obtenerTextoFiltro()}</h2>
        <div className="summary-stats">
          <div className="stat-card">
            <h3>💸 Total Gastado</h3>
            <p className="stat-value">L.{totalCompras.toFixed(2)}</p>
          </div>
          <div className="stat-card">
            <h3>📦 Total Compras</h3>
            <p className="stat-value">{comprasFiltradas?.length || 0}</p>
          </div>
          <div className="stat-card">
            <h3>📊 Promedio por Compra</h3>
            <p className="stat-value">
              L.{comprasFiltradas?.length > 0 ? (totalCompras / comprasFiltradas.length).toFixed(2) : '0.00'}
            </p>
          </div>
        </div>
      </div>

      {/* Lista de compras */}
      <div className="compras-content">
        {errorCompras ? (
          <div className="error-container">
            <p className="error-message">❌ Error al cargar las compras: {errorCompras.message}</p>
            <button onClick={reloadData} className="btn-retry">
              🔄 Reintentar
            </button>
          </div>
        ) : loadingCompras ? (
          <div className="loading-container">
            <p className="loading-message">🔄 Cargando compras...</p>
          </div>
        ) : (
          <div className="compras-list">
            <h3>📋 Lista de Compras</h3>
            {comprasFiltradas && comprasFiltradas.length > 0 ? (
              <div className="compras-grid">
                {comprasFiltradas
                  .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                  .map((compra) => (
                    <div key={compra._id} className="compra-card">
                      <div className="compra-header">
                        <h4 className="compra-producto">
                          {searchTerm ? (
                            <span dangerouslySetInnerHTML={{
                              __html: compra.producto.replace(
                                new RegExp(`(${searchTerm})`, 'gi'),
                                '<mark>$1</mark>'
                              )
                            }} />
                          ) : (
                            compra.producto
                          )}
                        </h4>
                        <button 
                          onClick={() => handleDelete(compra._id)}
                          className="btn-delete"
                          title="Eliminar compra"
                        >
                          🗑️
                        </button>
                      </div>
                      <div className="compra-details">
                        <div className="detail-item">
                          <span className="detail-label">Cantidad:</span>
                          <span className="detail-value">{compra.cantidad} unidades</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Precio unitario:</span>
                          <span className="detail-value">L.{compra.precio.toFixed(2)}</span>
                        </div>
                        <div className="detail-item total">
                          <span className="detail-label">Total:</span>
                          <span className="detail-value">L.{(compra.cantidad * compra.precio).toFixed(2)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Fecha:</span>
                          <span className="detail-value">
                            {new Date(compra.fecha).toLocaleString('es-ES')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="no-data">
                {searchTerm ? (
                  <div>
                    <p>� No se encontraron compras que contengan "{searchTerm}"</p>
                    <p>en el período seleccionado</p>
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="btn-clear-search-large"
                    >
                      🔄 Limpiar búsqueda
                    </button>
                  </div>
                ) : (
                  <div>
                    <p>�📭 No hay compras registradas para el período seleccionado</p>
                    <button 
                      onClick={() => setShowModal(true)} 
                      className="btn-add-first"
                    >
                      ➕ Registrar primera compra
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal para nueva compra */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Nueva Compra</h2>
              <button 
                onClick={() => setShowModal(false)} 
                className="btn-close"
              >
                ✖️
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="compra-form">
              <div className="form-group">
                <label>🏷️ Producto:</label>
                <input
                  type="text"
                  value={formData.producto}
                  onChange={(e) => setFormData({...formData, producto: e.target.value})}
                  placeholder="Nombre del producto o servicio"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>📦 Cantidad:</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.cantidad}
                    onChange={(e) => setFormData({...formData, cantidad: e.target.value})}
                    placeholder="1"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>💰 Precio unitario:</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.precio}
                    onChange={(e) => setFormData({...formData, precio: e.target.value})}
                    placeholder="0.00"
                    className="form-input"
                    required
                  />
                </div>
              </div>

              {formData.cantidad && formData.precio && (
                <div className="total-preview">
                  <strong>💸 Total: L.{(parseFloat(formData.cantidad || 0) * parseFloat(formData.precio || 0)).toFixed(2)}</strong>
                </div>
              )}

              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="btn-cancel"
                >
                  ❌ Cancelar
                </button>
                <button type="submit" className="btn-save">
                  💾 Guardar Compra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Compras