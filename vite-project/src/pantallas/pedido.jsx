import { useState, useEffect } from 'react'
import useFetch from '../hooks/usefetch'
import './pedido.css'

const Pedidos = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  const { data: productos, loading: loadingProductos } = useFetch(`http://localhost:5000/api/productos?refresh=${refreshKey}`)
  const { data: ventas, loading: loadingVentas } = useFetch(`http://localhost:5000/api/venta-encabezado?refresh=${refreshKey}`)
  
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('')
  const [selectedVenta, setSelectedVenta] = useState(null)
  const [ventaDetalles, setVentaDetalles] = useState([]) // Nuevo estado para los detalles
  
  const [formData, setFormData] = useState({
    cliente: '',
    entrega: 'recoger en comedor',
    detalles: []
  })
  
  const [selectedProducto, setSelectedProducto] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroEntrega, setFiltroEntrega] = useState('') // Nuevo filtro por entrega
  const [filtroFecha, setFiltroFecha] = useState('hoy') // Filtro por fecha (por defecto: hoy)

  const reloadData = () => {
    setRefreshKey(prev => prev + 1)
  }

  // useEffect para actualizar la venta seleccionada cuando los datos cambian
  useEffect(() => {
    if (selectedVenta && ventas && ventas.length > 0) {
      const ventaActualizada = ventas.find(v => 
        (v._id && v._id === selectedVenta._id) || 
        (v.id && v.id === selectedVenta.id)
      )
      if (ventaActualizada && modalType === 'view') {
        setSelectedVenta(ventaActualizada)
        // Forzar recarga de detalles cada vez que cambian los datos
        const timer = setTimeout(() => {
          cargarDetallesVenta(ventaActualizada._id || ventaActualizada.id)
        }, 500) // Pequeño delay para asegurar que la DB se actualizó
        
        return () => clearTimeout(timer)
      }
    }
  }, [ventas, refreshKey])

  // Función para recargar datos y detalles si hay una venta seleccionada
  const reloadDataAndDetails = async () => {
    reloadData()
  }

  // Función para cargar los detalles de una venta específica
  const cargarDetallesVenta = async (ventaId) => {
    try {
      console.log('🔍 Cargando detalles para ventaId:', ventaId)
      
      // Primero intentar con el endpoint específico
      let response = await fetch(`http://localhost:5000/api/venta-detalle/venta/${ventaId}`)
      let detallesVenta = []
      
      if (response.ok) {
        detallesVenta = await response.json()
        console.log('✅ Detalles obtenidos con endpoint específico:', detallesVenta)
      } else {
        console.log('⚠️ Endpoint específico no disponible, usando método alternativo')
        // Método alternativo: cargar todos y filtrar
        response = await fetch(`http://localhost:5000/api/venta-detalle`)
        if (!response.ok) throw new Error('Error al cargar detalles')
        
        const todosLosDetalles = await response.json()
        detallesVenta = todosLosDetalles.filter(detalle => detalle.ventaEncId === ventaId)
        console.log('📋 Detalles filtrados:', detallesVenta)
      }
      
      // Enriquecer los detalles con información del producto
      const detallesConNombres = detallesVenta.map(detalle => {
        const producto = productos?.find(p => p._id === detalle.productoId)
        return {
          ...detalle,
          nombre: producto ? producto.nombre : 'Producto no encontrado'
        }
      })
      
      console.log('🏷️ Detalles con nombres:', detallesConNombres)
      setVentaDetalles(detallesConNombres)
      return detallesConNombres
    } catch (error) {
      console.error('❌ Error al cargar detalles de venta:', error)
      setVentaDetalles([])
      return []
    }
  }

  const opcionesEntrega = [
    'domicilio 1',
    'domicilio 2', 
    'recoger en comedor',
    'comer en el lugar'
  ]

  // Funciones auxiliares para fechas
  const esHoy = (fecha) => {
    const hoy = new Date()
    const fechaVenta = new Date(fecha)
    return fechaVenta.toDateString() === hoy.toDateString()
  }

  const esSemanaActual = (fecha) => {
    const hoy = new Date()
    const fechaVenta = new Date(fecha)
    const inicioSemana = new Date(hoy)
    inicioSemana.setDate(hoy.getDate() - hoy.getDay())
    inicioSemana.setHours(0, 0, 0, 0)
    
    const finSemana = new Date(inicioSemana)
    finSemana.setDate(inicioSemana.getDate() + 6)
    finSemana.setHours(23, 59, 59, 999)
    
    return fechaVenta >= inicioSemana && fechaVenta <= finSemana
  }

  const esMesActual = (fecha) => {
    const hoy = new Date()
    const fechaVenta = new Date(fecha)
    return fechaVenta.getMonth() === hoy.getMonth() && 
           fechaVenta.getFullYear() === hoy.getFullYear()
  }

  const ventasFiltradas = ventas?.filter(venta => {
    const coincideBusqueda = venta.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           venta.entrega.toLowerCase().includes(searchTerm.toLowerCase())
    
    const coincideEntrega = filtroEntrega === '' || venta.entrega === filtroEntrega
    
    // Filtro por fecha
    let coincideFecha = true
    if (filtroFecha === 'hoy') {
      coincideFecha = esHoy(venta.fecha)
    } else if (filtroFecha === 'semana') {
      coincideFecha = esSemanaActual(venta.fecha)
    } else if (filtroFecha === 'mes') {
      coincideFecha = esMesActual(venta.fecha)
    }
    // Si filtroFecha === 'todos', no se aplica filtro (coincideFecha = true)
    
    return coincideBusqueda && coincideEntrega && coincideFecha
  }) || []

  // Calcular el total de las ventas filtradas
  const calcularTotalFiltrado = () => {
    return ventasFiltradas.reduce((total, venta) => total + venta.total, 0)
  }

  const openModal = async (type, venta = null) => {
    setModalType(type)
    setSelectedVenta(venta)
    setVentaDetalles([]) // Limpiar detalles anteriores
    
    if (type === 'create') {
      setFormData({
        cliente: '',
        entrega: 'recoger en comedor',
        detalles: []
      })
    } else if (type === 'edit' && venta) {
      // Cargar los detalles desde la base de datos para edición
      const detalles = await cargarDetallesVenta(venta._id || venta.id)
      
      const detallesConNombres = detalles?.map(detalle => {
        const producto = productos?.find(p => p._id === detalle.productoId)
        return {
          ...detalle,
          nombre: producto ? producto.nombre : 'Producto no encontrado'
        }
      }) || []

      setFormData({
        cliente: venta.cliente,
        entrega: venta.entrega,
        detalles: detallesConNombres
      })
    } else if (type === 'view' && venta) {
      // Cargar los detalles de la venta para mostrar en el modal de vista
      await cargarDetallesVenta(venta._id || venta.id)
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setModalType('')
    setSelectedVenta(null)
    setVentaDetalles([]) // Limpiar detalles cargados
    setSelectedProducto('')
    setCantidad(1)
  }

  const agregarProducto = () => {
    if (!selectedProducto || cantidad <= 0) return

    const producto = productos.find(p => p._id === selectedProducto)
    if (!producto) return

    const nuevoDetalle = {
      productoId: producto._id,
      nombre: producto.nombre,
      cantidad: parseInt(cantidad),
      precio: producto.precio
    }

    setFormData(prev => ({
      ...prev,
      detalles: [...prev.detalles, nuevoDetalle]
    }))

    setSelectedProducto('')
    setCantidad(1)
  }

  const removerProducto = (index) => {
    setFormData(prev => ({
      ...prev,
      detalles: prev.detalles.filter((_, i) => i !== index)
    }))
  }

  const calcularTotal = () => {
    const total = formData.detalles.reduce((total, detalle) => 
      total + (detalle.cantidad * detalle.precio), 0
    )
    return total
  }

  const createVenta = async () => {
    try {
      if (!formData.cliente.trim()) {
        alert('Por favor ingresa el nombre del cliente')
        return
      }

      if (formData.detalles.length === 0) {
        alert('Por favor agrega al menos un producto')
        return
      }

      const total = calcularTotal()
      
      // Paso 1: Crear el encabezado de venta
      const ventaEncabezadoData = {
        cliente: formData.cliente,
        entrega: formData.entrega,
        total: total
      }

      const encabezadoResponse = await fetch('http://localhost:5000/api/venta-encabezado', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ventaEncabezadoData)
      })

      if (!encabezadoResponse.ok) throw new Error('Error al crear el encabezado de venta')
      
      const ventaCreada = await encabezadoResponse.json()
      const ventaId = ventaCreada._id || ventaCreada.id

      // Paso 2: Crear los detalles de venta
      for (const detalle of formData.detalles) {
        const detalleData = {
          ventaEncId: ventaId,
          productoId: detalle.productoId,
          cantidad: detalle.cantidad,
          precio: detalle.precio
        }

        const detalleResponse = await fetch('http://localhost:5000/api/venta-detalle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(detalleData)
        })

        if (!detalleResponse.ok) {
          console.error('Error al crear detalle de venta:', detalle)
        }
      }
      
      await reloadDataAndDetails()
      closeModal()
      alert('Venta creada exitosamente')
    } catch (error) {
      console.error('Error completo:', error)
      alert('Error al crear la venta: ' + error.message)
    }
  }

  const deleteVenta = async () => {
    try {
      const ventaId = selectedVenta._id || selectedVenta.id

      // Paso 1: Eliminar detalles de venta (opcional)
      // Nota: El endpoint para eliminar por ventaEncId necesita revisión en el backend
      const deleteDetallesResponse = await fetch(`http://localhost:5000/api/venta-detalle/ventaEnc/${ventaId}`, {
        method: 'DELETE'
      })

      if (!deleteDetallesResponse.ok) {
        console.warn('No se pudieron eliminar los detalles de venta - continuando con eliminación del encabezado')
      }

      // Paso 2: Eliminar encabezado de venta
      const deleteEncabezadoResponse = await fetch(`http://localhost:5000/api/venta-encabezado/${ventaId}`, {
        method: 'DELETE'
      })

      if (!deleteEncabezadoResponse.ok) throw new Error('Error al eliminar venta')
      
      await reloadDataAndDetails()
      closeModal()
      alert('Venta eliminada exitosamente')
    } catch (error) {
      console.error('Error completo:', error)
      alert('Error al eliminar la venta: ' + error.message)
    }
  }

  const updateVenta = async () => {
    try {
      if (!formData.cliente.trim()) {
        alert('Por favor ingresa el nombre del cliente')
        return
      }

      if (formData.detalles.length === 0) {
        alert('Por favor agrega al menos un producto')
        return
      }

      const total = calcularTotal()
      const ventaId = selectedVenta._id || selectedVenta.id

      // Paso 1: Actualizar el encabezado de venta
      const ventaEncabezadoData = {
        cliente: formData.cliente,
        entrega: formData.entrega,
        total: total
      }

      const encabezadoResponse = await fetch(`http://localhost:5000/api/venta-encabezado/${ventaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ventaEncabezadoData)
      })

      if (!encabezadoResponse.ok) throw new Error('Error al actualizar el encabezado de venta')

      // Paso 2: Obtener detalles existentes para hacer comparación
      console.log(`Cargando detalles existentes para comparación...`)
      const detallesExistentes = await cargarDetallesVenta(ventaId)
      
      // Paso 3: Eliminar detalles que ya no están en el formulario
      for (const detalleExistente of detallesExistentes) {
        const existeEnFormulario = formData.detalles.some(detalle => 
          detalle.productoId === detalleExistente.productoId
        )
        
        if (!existeEnFormulario) {
          console.log(`Eliminando detalle para producto: ${detalleExistente.productoId}`)
          try {
            const deleteResponse = await fetch(`http://localhost:5000/api/venta-detalle/${detalleExistente._id}`, {
              method: 'DELETE'
            })
            
            if (!deleteResponse.ok) {
              console.warn(`No se pudo eliminar el detalle ${detalleExistente._id}`)
            }
          } catch (error) {
            console.warn(`Error al eliminar detalle individual:`, error)
          }
        }
      }

      // Paso 4: Crear o actualizar detalles del formulario
      for (const detalle of formData.detalles) {
        const detalleExistente = detallesExistentes.find(d => d.productoId === detalle.productoId)
        
        if (detalleExistente) {
          // Actualizar detalle existente si cambió la cantidad o precio
          if (detalleExistente.cantidad !== detalle.cantidad || detalleExistente.precio !== detalle.precio) {
            console.log(`Actualizando detalle para producto: ${detalle.productoId}`)
            
            const updateData = {
              cantidad: detalle.cantidad,
              precio: detalle.precio
            }
            
            try {
              const updateResponse = await fetch(`http://localhost:5000/api/venta-detalle/${detalleExistente._id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
              })
              
              if (!updateResponse.ok) {
                console.warn(`No se pudo actualizar el detalle ${detalleExistente._id}`)
              }
            } catch (error) {
              console.warn(`Error al actualizar detalle:`, error)
            }
          }
        } else {
          // Crear nuevo detalle
          console.log(`Creando nuevo detalle para producto: ${detalle.productoId}`)
          
          const detalleData = {
            ventaEncId: ventaId,
            productoId: detalle.productoId,
            cantidad: detalle.cantidad,
            precio: detalle.precio
          }

          try {
            const detalleResponse = await fetch('http://localhost:5000/api/venta-detalle', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(detalleData)
            })

            if (!detalleResponse.ok) {
              console.warn(`Error al crear detalle de venta para el producto: ${detalle.nombre}`)
            }
          } catch (error) {
            console.warn(`Error al crear nuevo detalle:`, error)
          }
        }
      }

      console.log(`Proceso de actualización completado`)
      
      await reloadDataAndDetails()
      
      // Forzar recarga adicional de detalles si estamos en modo vista
      if (modalType === 'view' && selectedVenta) {
        setTimeout(async () => {
          console.log('Recargando detalles después de actualización...')
          await cargarDetallesVenta(selectedVenta._id || selectedVenta.id)
        }, 1000)
      }
      
      closeModal()
      alert('Venta actualizada exitosamente. Los detalles se han sincronizado correctamente.')
    } catch (error) {
      console.error('Error completo:', error)
      alert('Error al actualizar la venta: ' + error.message)
    }
  }

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loadingVentas || loadingProductos) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando pedidos...</p>
      </div>
    )
  }

  return (
    <div className="pedidos-container">
      <div className="pedidos-header">
        <h1>📋 Gestión de Pedidos</h1>
        <div className="header-actions">
          <div className="search-container">
            <input
              type="text"
              placeholder="Buscar por cliente o entrega..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-container">
            <select
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="filter-select"
            >
              <option value="hoy">📅 Hoy</option>
              <option value="semana">📅 Esta Semana</option>
              <option value="mes">📅 Este Mes</option>
              <option value="todos">📅 Todas las fechas</option>
            </select>
          </div>
          <div className="filter-container">
            <select
              value={filtroEntrega}
              onChange={(e) => setFiltroEntrega(e.target.value)}
              className="filter-select"
            >
              <option value="">🚚 Todos los tipos de entrega</option>
              {opcionesEntrega.map(opcion => (
                <option key={opcion} value={opcion}>{opcion}</option>
              ))}
            </select>
          </div>
          <button onClick={() => openModal('create')} className="btn-primary">
            ➕ Nuevo Pedido
          </button>
        </div>
      </div>

      <div className="ventas-stats">
        <div className="stat-card">
          <h3>
            {filtroFecha === 'hoy' ? '📅 Ventas Hoy' :
             filtroFecha === 'semana' ? '📅 Ventas Semana' :
             filtroFecha === 'mes' ? '📅 Ventas Mes' : '📅 Total Ventas'}
          </h3>
          <p>{ventasFiltradas.length}</p>
        </div>
        <div className="stat-card total-dinamico">
          <h3>💰 {filtroEntrega ? `Ingresos - ${filtroEntrega}` : 
               filtroFecha === 'hoy' ? 'Ingresos Hoy' :
               filtroFecha === 'semana' ? 'Ingresos Semana' :
               filtroFecha === 'mes' ? 'Ingresos Mes' : 'Ingresos Totales'}</h3>
          <p className="total-amount">${calcularTotalFiltrado().toFixed(2)}</p>
          <small className="ventas-count">
            {filtroEntrega ? 
              `${ventasFiltradas.length} ventas de ${filtroEntrega}` : 
              `${ventasFiltradas.length} ventas${filtroFecha !== 'todos' ? ` (${filtroFecha})` : ''}`
            }
          </small>
        </div>
      </div>

      <div className="ventas-grid">
        {ventasFiltradas.length === 0 ? (
          <div className="no-data">
            <p>No hay pedidos que mostrar</p>
          </div>
        ) : (
          ventasFiltradas.map((venta) => (
            <div key={venta._id} className="venta-card">
              <div className="venta-header">
                <h3>🧑‍💼 {venta.cliente}</h3>
                <span className="venta-fecha">{formatearFecha(venta.fecha)}</span>
              </div>
              <div className="venta-info">
                <p><strong>Entrega:</strong> {venta.entrega}</p>
                <p><strong>Total:</strong> <span className="total">${venta.total.toFixed(2)}</span></p>
              </div>
              <div className="venta-actions">
                <button onClick={() => openModal('view', venta)} className="btn-secondary btn-small">
                  👁️ Ver
                </button>
                <button onClick={() => openModal('edit', venta)} className="btn-primary btn-small">
                  ✏️ Editar
                </button>
                <button onClick={() => openModal('delete', venta)} className="btn-danger btn-small">
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {modalType === 'create' && '➕ Nuevo Pedido'}
                {modalType === 'edit' && '✏️ Editar Pedido'}
                {modalType === 'view' && '👁️ Detalles del Pedido'}
                {modalType === 'delete' && '🗑️ Eliminar Pedido'}
              </h2>
              <button onClick={closeModal} className="close-btn">✕</button>
            </div>

            <div className="modal-content" style={{
              maxHeight: '70vh',
              overflowY: 'auto',
              paddingRight: '0.5rem'
            }}>
              {(modalType === 'create' || modalType === 'edit') && (
                <div className="form-container">
                  <div className="form-group">
                    <label>Cliente:</label>
                    <input
                      type="text"
                      value={formData.cliente}
                      onChange={(e) => setFormData({...formData, cliente: e.target.value})}
                      placeholder="Nombre del cliente"
                    />
                  </div>

                  <div className="form-group">
                    <label>Tipo de Entrega:</label>
                    <select
                      value={formData.entrega}
                      onChange={(e) => setFormData({...formData, entrega: e.target.value})}
                    >
                      {opcionesEntrega.map(opcion => (
                        <option key={opcion} value={opcion}>{opcion}</option>
                      ))}
                    </select>
                  </div>

                  <div className="productos-section">
                    <h3>Agregar Productos</h3>
                    
                    <div className="add-producto-form">
                      <select
                        value={selectedProducto}
                        onChange={(e) => setSelectedProducto(e.target.value)}
                      >
                        <option value="">Seleccionar producto disponible...</option>
                        {productos?.filter(p => p.disponibilidad).map(producto => (
                          <option key={producto._id} value={producto._id}>
                            ✅ {producto.nombre} - ${producto.precio}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={cantidad}
                        onChange={(e) => setCantidad(e.target.value)}
                        placeholder="Cantidad"
                      />
                      <button type="button" onClick={agregarProducto} className="btn-secondary">
                        ➕ Agregar
                      </button>
                    </div>
                  </div>

                  {formData.detalles.length > 0 && (
                    <div className="detalles-pedido">
                      <h3>Productos en el Pedido</h3>
                      <div className="detalles-list">
                        {formData.detalles.map((detalle, index) => (
                          <div key={index} className="detalle-item">
                            <span>{detalle.nombre}</span>
                            <span>Cantidad: {detalle.cantidad}</span>
                            <span>Precio: ${detalle.precio}</span>
                            <span>Subtotal: ${(detalle.cantidad * detalle.precio).toFixed(2)}</span>
                            <button 
                              onClick={() => removerProducto(index)}
                              className="btn-danger btn-small"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="total-pedido">
                        <strong>Total: ${calcularTotal().toFixed(2)}</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {modalType === 'view' && selectedVenta && (
                <div className="venta-details">
                  <div className="detail-row">
                    <strong>Cliente:</strong> {selectedVenta.cliente}
                  </div>
                  <div className="detail-row">
                    <strong>Fecha:</strong> {formatearFecha(selectedVenta.fecha)}
                  </div>
                  <div className="detail-row">
                    <strong>Entrega:</strong> {selectedVenta.entrega}
                  </div>
                  <div className="detail-row">
                    <strong>Total:</strong> <span className="total">${selectedVenta.total.toFixed(2)}</span>
                  </div>
                  {ventaDetalles && ventaDetalles.length > 0 ? (
                    <div className="detalles-venta" style={{
                      marginTop: '1rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>Productos: ({ventaDetalles.length} productos)</h3>
                        <button 
                          onClick={() => cargarDetallesVenta(selectedVenta._id || selectedVenta.id)}
                          style={{
                            background: '#ffc107',
                            color: '#000',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          🔄 Actualizar
                        </button>
                      </div>
                      <div>
                        {ventaDetalles.map((detalle, index) => (
                          <div key={`${detalle._id}-${Date.now()}-${index}`} style={{
                            color: '#2d3748', 
                            backgroundColor: 'rgba(255,255,255,0.95)', 
                            border: '2px solid #FFD700',
                            padding: '1rem',
                            margin: '0.5rem 0',
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }}>
                            <div style={{color: '#2d3748', fontWeight: 'bold', fontSize: '1rem'}}>📦 {detalle.nombre}</div>
                            <div style={{color: '#4a5568', margin: '0.25rem 0'}}>🔢 Cantidad: {detalle.cantidad}</div>
                            <div style={{color: '#4a5568', margin: '0.25rem 0'}}>💰 Precio: ${detalle.precio.toFixed(2)}</div>
                            <div style={{color: '#27ae60', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '0.5rem'}}>💵 Subtotal: ${(detalle.cantidad * detalle.precio).toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="detalles-venta">
                      <h3>Productos:</h3>
                      <p style={{textAlign: 'center', color: '#999', fontStyle: 'italic'}}>
                        {ventaDetalles.length === 0 ? 'Cargando detalles...' : 'No hay productos en esta venta'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {modalType === 'delete' && selectedVenta && (
                <div className="delete-confirmation">
                  <p>¿Estás seguro de que deseas eliminar este pedido?</p>
                  <div className="venta-info">
                    <p><strong>Cliente:</strong> {selectedVenta.cliente}</p>
                    <p><strong>Total:</strong> ${selectedVenta.total.toFixed(2)}</p>
                    <p><strong>Fecha:</strong> {formatearFecha(selectedVenta.fecha)}</p>
                  </div>
                  <p className="warning">Esta acción no se puede deshacer.</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {modalType === 'create' && (
                <>
                  <button onClick={closeModal} className="btn-secondary">Cancelar</button>
                  <button onClick={createVenta} className="btn-primary">Crear Pedido</button>
                </>
              )}

              {modalType === 'edit' && (
                <>
                  <button onClick={closeModal} className="btn-secondary">Cancelar</button>
                  <button onClick={updateVenta} className="btn-primary">Actualizar Pedido</button>
                </>
              )}
              
              {modalType === 'delete' && (
                <>
                  <button onClick={closeModal} className="btn-secondary">Cancelar</button>
                  <button onClick={deleteVenta} className="btn-danger">Eliminar</button>
                </>
              )}
              
              {modalType === 'view' && (
                <button onClick={closeModal} className="btn-primary">Cerrar</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Pedidos