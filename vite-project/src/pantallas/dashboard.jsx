import { useState, useEffect } from 'react'
import useFetch from '../hooks/usefetch'
import { getApiUrl } from '../config/api.js'
import './dashboard.css'

const Dashboard = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  const { data: ventas, loading: loadingVentas } = useFetch(`${getApiUrl('/api/venta-encabezado')}?refresh=${refreshKey}`)
  const { data: ventasDetalle, loading: loadingDetalles } = useFetch(`${getApiUrl('/api/venta-detalle')}?refresh=${refreshKey}`)
  const { data: productos, loading: loadingProductos } = useFetch(`${getApiUrl('/api/productos')}?refresh=${refreshKey}`)
  const { data: compras, loading: loadingCompras } = useFetch(`${getApiUrl('/api/compras')}?refresh=${refreshKey}`)
  
  // Estados para filtros
  const [filtroTiempo, setFiltroTiempo] = useState('hoy')
  const [filtroEntrega, setFiltroEntrega] = useState('todos')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  const reloadData = () => {
    setRefreshKey(prev => prev + 1)
  }

  // Función para filtrar ventas por fecha
  const filtrarVentasPorFecha = (ventas) => {
    if (!ventas) return []
    
    const hoy = new Date()
    hoy.setHours(23, 59, 59, 999)
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
    
    const inicioSemana = new Date(hoy)
    inicioSemana.setDate(hoy.getDate() - hoy.getDay())
    inicioSemana.setHours(0, 0, 0, 0)
    
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    
    return ventas.filter(venta => {
      const fechaVenta = new Date(venta.fecha)
      
      // Filtro por tipo de entrega
      if (filtroEntrega !== 'todos' && venta.entrega !== filtroEntrega) {
        return false
      }
      
      // Filtro por tiempo
      switch (filtroTiempo) {
        case 'hoy':
          return fechaVenta >= inicioHoy && fechaVenta <= hoy
        case 'semana':
          return fechaVenta >= inicioSemana && fechaVenta <= hoy
        case 'mes':
          return fechaVenta >= inicioMes && fechaVenta <= hoy
        case 'personalizado':
          if (fechaInicio && fechaFin) {
            const inicio = new Date(fechaInicio)
            const fin = new Date(fechaFin)
            fin.setHours(23, 59, 59, 999)
            return fechaVenta >= inicio && fechaVenta <= fin
          }
          return true
        case 'todo':
        default:
          return true
      }
    })
  }

  // Función para filtrar compras por fecha
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
      
      // Filtro por tiempo
      switch (filtroTiempo) {
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

  // Calcular totales de ventas
  const ventasFiltradas = filtrarVentasPorFecha(ventas)
  const totalVentas = ventasFiltradas.reduce((total, venta) => total + venta.total, 0)
  const cantidadVentas = ventasFiltradas.length

  // Calcular totales de compras (egresos)
  const comprasFiltradas = filtrarComprasPorFecha(compras)
  const totalEgresos = comprasFiltradas.reduce((total, compra) => total + (compra.cantidad * compra.precio), 0)
  const cantidadCompras = comprasFiltradas.length

  // Calcular ganancia neta
  const gananciaNeta = totalVentas - totalEgresos

  // Calcular ventas por tipo de entrega
  const ventasPorEntrega = ventasFiltradas.reduce((acc, venta) => {
    acc[venta.entrega] = (acc[venta.entrega] || 0) + venta.total
    return acc
  }, {})

  // Calcular productos más vendidos
  const productosVendidos = ventasFiltradas.reduce((acc, venta) => {
    // Buscar detalles de esta venta
    const detallesVenta = ventasDetalle?.filter(detalle => 
      detalle.ventaEncId === (venta._id || venta.id)
    ) || []
    
    detallesVenta.forEach(detalle => {
      const productoId = detalle.productoId
      if (!acc[productoId]) {
        acc[productoId] = {
          cantidad: 0,
          total: 0,
          nombre: detalle.nombre || productos?.find(p => p._id === productoId)?.nombre || 'Producto sin nombre'
        }
      }
      acc[productoId].cantidad += detalle.cantidad
      acc[productoId].total += detalle.cantidad * detalle.precio
    })
    
    return acc
  }, {})

  // Calcular productos más comprados (egresos por producto)
  const productosComprados = comprasFiltradas.reduce((acc, compra) => {
    const producto = compra.producto
    if (!acc[producto]) {
      acc[producto] = {
        cantidad: 0,
        total: 0,
        nombre: producto
      }
    }
    acc[producto].cantidad += compra.cantidad
    acc[producto].total += compra.cantidad * compra.precio
    return acc
  }, {})

  // Ordenar productos por cantidad vendida
  const productosOrdenados = Object.entries(productosVendidos)
    .sort(([,a], [,b]) => b.cantidad - a.cantidad)
    .slice(0, 10) // Top 10

  // Ordenar productos comprados por cantidad
  const productosCompradosOrdenados = Object.entries(productosComprados)
    .sort(([,a], [,b]) => b.cantidad - a.cantidad)
    .slice(0, 10) // Top 10

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const obtenerTextoFiltro = () => {
    switch (filtroTiempo) {
      case 'hoy': return 'Hoy'
      case 'semana': return 'Esta semana'
      case 'mes': return 'Este mes'
      case 'personalizado': 
        if (fechaInicio && fechaFin) {
          return `${formatearFecha(fechaInicio)} - ${formatearFecha(fechaFin)}`
        }
        return 'Período personalizado'
      case 'todo': return 'Todo el tiempo'
      default: return 'Período seleccionado'
    }
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <h1>📊 Dashboard - COMEDOR FLORES</h1>
        <button onClick={reloadData} className="btn-refresh">
          🔄 Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="dashboard-filters">
        <div className="filter-group">
          <label>Período de tiempo:</label>
          <select 
            value={filtroTiempo} 
            onChange={(e) => setFiltroTiempo(e.target.value)}
            className="filter-select"
          >
            <option value="hoy">Hoy</option>
            <option value="semana">Esta semana</option>
            <option value="mes">Este mes</option>
            <option value="personalizado">Período personalizado</option>
            <option value="todo">Todo el tiempo</option>
          </select>
        </div>

        {filtroTiempo === 'personalizado' && (
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

        <div className="filter-group">
          <label>Tipo de entrega:</label>
          <select 
            value={filtroEntrega} 
            onChange={(e) => setFiltroEntrega(e.target.value)}
            className="filter-select"
          >
            <option value="todos">Todos</option>
            <option value="recoger en comedor">Recoger en comedor</option>
            <option value="comer en el lugar">Comer en el lugar</option>
            <option value="domicilio 1">Domicilio 1</option>
            <option value="domicilio 2">Domicilio 2</option>
          </select>
        </div>
      </div>

      {/* Resumen actual */}
      <div className="dashboard-summary">
        <h2>📈 Resumen: {obtenerTextoFiltro()}</h2>
        {filtroEntrega !== 'todos' && (
          <p className="filter-info">🚚 Filtrado por: {filtroEntrega}</p>
        )}
      </div>

      {loadingVentas || loadingDetalles || loadingProductos || loadingCompras ? (
        <div className="loading-container">
          <p className="loading-message">📊 Cargando datos del dashboard...</p>
        </div>
      ) : (
        <div className="dashboard-content">
          {/* Métricas principales */}
          <div className="metrics-grid">
            <div className="metric-card total-sales">
              <h3>💰 Total de Ventas (Ingresos)</h3>
              <div className="metric-value">L.{totalVentas.toFixed(2)}</div>
              <div className="metric-subtitle">{cantidadVentas} ventas realizadas</div>
            </div>

            <div className="metric-card total-expenses">
              <h3>� Total de Compras (Egresos)</h3>
              <div className="metric-value">L.{totalEgresos.toFixed(2)}</div>
              <div className="metric-subtitle">{cantidadCompras} compras realizadas</div>
            </div>

            <div className="metric-card net-profit">
              <h3>📈 Ganancia Neta</h3>
              <div className={`metric-value ${gananciaNeta >= 0 ? 'positive' : 'negative'}`}>
                L.{gananciaNeta.toFixed(2)}
              </div>
              <div className="metric-subtitle">
                {gananciaNeta >= 0 ? '✅ Ganancia' : '⚠️ Pérdida'}
              </div>
            </div>

            <div className="metric-card average-sale">
              <h3>📊 Promedio por Venta</h3>
              <div className="metric-value">
                L.{cantidadVentas > 0 ? (totalVentas / cantidadVentas).toFixed(2) : '0.00'}
              </div>
              <div className="metric-subtitle">Ticket promedio</div>
            </div>
          </div>

          {/* Ventas por tipo de entrega */}
          <div className="dashboard-section">
            <h3>🚚 Ventas por Tipo de Entrega</h3>
            {Object.keys(ventasPorEntrega).length > 0 ? (
              <div className="delivery-stats">
                {Object.entries(ventasPorEntrega).map(([tipo, total]) => (
                  <div key={tipo} className="delivery-item">
                    <div className="delivery-info">
                      <span className="delivery-type">{tipo}</span>
                      <span className="delivery-total">L.{total.toFixed(2)}</span>
                    </div>
                    <div className="delivery-bar">
                      <div 
                        className="delivery-fill"
                        style={{ 
                          width: `${totalVentas > 0 ? (total / totalVentas) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <span className="delivery-percentage">
                      {totalVentas > 0 ? ((total / totalVentas) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data">
                <p>📭 No hay datos de entrega para el período seleccionado</p>
              </div>
            )}
          </div>

          {/* Productos más vendidos */}
          <div className="dashboard-section">
            <h3>🏆 Productos Más Vendidos</h3>
            {productosOrdenados.length > 0 ? (
              <div className="products-ranking">
                {productosOrdenados.map(([productoId, datos], index) => (
                  <div key={productoId} className="product-rank-item">
                    <div className="rank-badge">#{index + 1}</div>
                    <div className="product-info">
                      <span className="product-name">{datos.nombre}</span>
                      <span className="product-stats">
                        {datos.cantidad} unidades • L.{datos.total.toFixed(2)}
                      </span>
                    </div>
                    <div className="product-bar">
                      <div 
                        className="product-fill"
                        style={{ 
                          width: `${productosOrdenados.length > 0 ? 
                            (datos.cantidad / productosOrdenados[0][1].cantidad) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data">
                <p>📦 No hay productos vendidos en el período seleccionado</p>
              </div>
            )}
          </div>

          {/* Productos más comprados (egresos) */}
          <div className="dashboard-section">
            <h3>📦 Productos Más Comprados (Egresos)</h3>
            {productosCompradosOrdenados.length > 0 ? (
              <div className="products-ranking">
                {productosCompradosOrdenados.map(([producto, datos], index) => (
                  <div key={producto} className="product-rank-item expense-item">
                    <div className="rank-badge expense-badge">#{index + 1}</div>
                    <div className="product-info">
                      <span className="product-name">{datos.nombre}</span>
                      <span className="product-stats">
                        {datos.cantidad} unidades • L.{datos.total.toFixed(2)}
                      </span>
                    </div>
                    <div className="product-bar">
                      <div 
                        className="product-fill expense-fill"
                        style={{ 
                          width: `${productosCompradosOrdenados.length > 0 ? 
                            (datos.cantidad / productosCompradosOrdenados[0][1].cantidad) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data">
                <p>🛒 No hay compras registradas en el período seleccionado</p>
              </div>
            )}
          </div>

          {/* Resumen de actividad reciente */}
          <div className="dashboard-section">
            <h3>⏰ Actividad Reciente</h3>
            {ventasFiltradas.length > 0 ? (
              <div className="recent-activity">
                {ventasFiltradas
                  .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                  .slice(0, 5)
                  .map((venta, index) => (
                    <div key={venta._id || venta.id} className="activity-item">
                      <div className="activity-icon">🧾</div>
                      <div className="activity-details">
                        <span className="activity-customer">{venta.cliente}</span>
                        <span className="activity-info">
                          {venta.entrega} • L.{venta.total.toFixed(2)}
                        </span>
                        <span className="activity-time">
                          {new Date(venta.fecha).toLocaleString('es-ES')}
                        </span>
                      </div>
                    </div>
                  ))
                }
              </div>
            ) : (
              <div className="no-data">
                <p>💤 No hay actividad reciente para mostrar</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard