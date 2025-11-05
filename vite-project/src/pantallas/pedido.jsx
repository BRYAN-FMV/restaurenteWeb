import { useState, useEffect } from 'react'
import { PDFDownloadLink, pdf } from '@react-pdf/renderer'
import useFetch from '../hooks/usefetch'
import TicketPDF from '../componentes/TicketPDF'
import { getApiUrl } from '../config/api.js'
import './pedido.css'

const Pedidos = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  const { data: productos, loading: loadingProductos } = useFetch(`${getApiUrl('/api/productos')}?refresh=${refreshKey}`)
  const { data: ventas, loading: loadingVentas } = useFetch(`${getApiUrl('/api/venta-encabezado')}?refresh=${refreshKey}`)
  
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('')
  const [selectedVenta, setSelectedVenta] = useState(null)
  const [ventaDetalles, setVentaDetalles] = useState([])
  const [ultimaVentaCreada, setUltimaVentaCreada] = useState(null)
  
  const [formData, setFormData] = useState({
    cliente: '',
    entrega: 'recoger en comedor',
    detalles: []
  })
  
  const [selectedProducto, setSelectedProducto] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroEntrega, setFiltroEntrega] = useState('')
  const [filtroFecha, setFiltroFecha] = useState('hoy')
  const [shouldPrintAfterSave, setShouldPrintAfterSave] = useState(false)

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
        const timer = setTimeout(() => {
          cargarDetallesVenta(ventaActualizada._id || ventaActualizada.id)
        }, 500)
        
        return () => clearTimeout(timer)
      }
    }
  }, [ventas, refreshKey])

  const reloadDataAndDetails = async () => {
    reloadData()
  }

  // Función para cargar los detalles de una venta específica
  const cargarDetallesVenta = async (ventaId) => {
    try {
      console.log('🔍 Cargando detalles para ventaId:', ventaId)
      
      // Usar endpoint específico con populate para obtener nombres de productos
      const response = await fetch(getApiUrl(`/api/venta-detalle/venta/${ventaId}`))
      if (!response.ok) {
        console.log('⚠️ Endpoint específico falló, usando método alternativo')
        
        // Método alternativo: obtener todos y filtrar
        const responseAll = await fetch(getApiUrl('/api/venta-detalle'))
        if (!responseAll.ok) throw new Error('Error al cargar detalles')
        
        const todosLosDetalles = await responseAll.json()
        const detallesVenta = todosLosDetalles.filter(detalle => detalle.ventaEncId === ventaId)
        
        // Para cada detalle, buscar el producto si no está poblado
        const detallesConNombres = await Promise.all(
          detallesVenta.map(async (detalle) => {
            if (typeof detalle.productoId === 'object' && detalle.productoId !== null) {
              return {
                ...detalle,
                nombre: detalle.productoId.nombre || 'Producto sin nombre'
              }
            } else {
              // Buscar el producto por ID
              try {
                const prodResponse = await fetch(getApiUrl(`/api/productos/${detalle.productoId}`))
                if (prodResponse.ok) {
                  const producto = await prodResponse.json()
                  return {
                    ...detalle,
                    nombre: producto.nombre || 'Producto sin nombre'
                  }
                }
              } catch (error) {
                console.error('Error buscando producto:', error)
              }
              
              return {
                ...detalle,
                nombre: `Producto (ID: ${detalle.productoId})`
              }
            }
          })
        )
        
        console.log('🏷️ Detalles con nombres:', detallesConNombres)
        setVentaDetalles(detallesConNombres)
        return detallesConNombres
      }
      
      const detallesVenta = await response.json()
      console.log('📋 Detalles obtenidos:', detallesVenta)
      
      const detallesConNombres = detallesVenta.map(detalle => ({
        ...detalle,
        nombre: detalle.productoId?.nombre || `Producto (ID: ${detalle.productoId})`
      }))
      
      console.log('🏷️ Detalles con nombres:', detallesConNombres)
      setVentaDetalles(detallesConNombres)
      return detallesConNombres
    } catch (error) {
      console.error('❌ Error al cargar detalles de venta:', error)
      setVentaDetalles([])
      return []
    }
  }

  // Función para agregar producto al pedido
  const addProduct = () => {
    if (!selectedProducto || cantidad <= 0) return

    const producto = productos?.find(p => p._id === selectedProducto)
    if (!producto) return

    const nuevoDetalle = {
      id: Date.now(),
      productoId: producto._id,
      nombre: producto.nombre,
      cantidad: cantidad,
      precio: producto.precio,
      observaciones: ''
    }

    setFormData(prev => ({
      ...prev,
      detalles: [...prev.detalles, nuevoDetalle]
    }))

    setSelectedProducto('')
    setCantidad(1)
  }

  const removeProduct = (index) => {
    setFormData(prev => ({
      ...prev,
      detalles: prev.detalles.filter((_, i) => i !== index)
    }))
  }

  const updateObservaciones = (index, observaciones) => {
    setFormData(prev => ({
      ...prev,
      detalles: prev.detalles.map((detalle, i) => 
        i === index ? { ...detalle, observaciones } : detalle
      )
    }))
  }

  const calcularTotal = () => {
    return formData.detalles.reduce((total, detalle) => total + (detalle.cantidad * detalle.precio), 0)
  }

  const openModal = (type, venta = null) => {
    setModalType(type)
    setSelectedVenta(venta)
    setShowModal(true)
    
    if (type === 'edit' && venta) {
      console.log('✏️ Abriendo modal de edición para venta:', venta._id || venta.id)
      setFormData({
        cliente: venta.cliente,
        entrega: venta.entrega,
        detalles: []
      })
      cargarDetallesVenta(venta._id || venta.id).then(detalles => {
        console.log('📋 Detalles cargados para edición:', detalles)
        const detallesParaEdicion = detalles.map(detalle => ({
          id: Date.now() + Math.random(),
          productoId: detalle.productoId,
          nombre: detalle.nombre,
          cantidad: detalle.cantidad,
          precio: detalle.precio,
          observaciones: '' // ← Siempre vacío desde BD
        }))
        console.log('✏️ Detalles preparados para edición:', detallesParaEdicion)
        setFormData(prev => ({
          ...prev,
          detalles: detallesParaEdicion
        }))
      })
    } else if (type === 'view' && venta) {
      cargarDetallesVenta(venta._id || venta.id)
    } else if (type === 'create') {
      setUltimaVentaCreada(null) // Resetear la última venta creada
      setFormData({
        cliente: '',
        entrega: 'recoger en comedor',
        detalles: []
      })
      setVentaDetalles([])
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setModalType('')
    setSelectedVenta(null)
    setVentaDetalles([])
    setUltimaVentaCreada(null) // Resetear al cerrar modal
    setFormData({
      cliente: '',
      entrega: 'recoger en comedor',
      detalles: []
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await saveOrder(false) // No imprimir automáticamente
  }

  const handleSaveAndPrint = async (e) => {
    e.preventDefault()
    await saveOrder(true) // Imprimir automáticamente después de guardar
  }

  const saveOrder = async (shouldPrint = false) => {
    if (!formData.cliente.trim()) {
      alert('❌ Por favor ingresa el nombre del cliente')
      return
    }
    
    if (formData.detalles.length === 0) {
      alert('❌ Agrega al menos un producto al pedido')
      return
    }

    const total = calcularTotal()
    const ventaData = {
      cliente: formData.cliente,
      entrega: formData.entrega,
      total: total,
      fecha: new Date().toISOString()
    }

    try {
      let ventaResponse
      const ventaId = selectedVenta?._id || selectedVenta?.id

      if (modalType === 'edit' && ventaId) {
        ventaResponse = await fetch(getApiUrl(`/api/venta-encabezado/${ventaId}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ventaData)
        })
      } else {
        ventaResponse = await fetch(getApiUrl('/api/venta-encabezado'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ventaData)
        })
      }

      if (!ventaResponse.ok) {
        throw new Error('Error al guardar la venta')
      }

      const ventaResult = await ventaResponse.json()
      const finalVentaId = ventaResult.ventaId || ventaResult._id || ventaId

      if (modalType === 'edit') {
        console.log('🗑️ Eliminando detalles anteriores para ventaId:', finalVentaId)
        console.log('🔍 Modal type actual:', modalType)
        console.log('🔍 Venta seleccionada:', selectedVenta)
        
        // Primero obtenemos los detalles existentes usando el endpoint correcto
        const detallesResponse = await fetch(getApiUrl(`/api/venta-detalle/venta/${finalVentaId}`))
        if (detallesResponse.ok) {
          const detallesExistentes = await detallesResponse.json()
          console.log('📋 Detalles encontrados para eliminar:', detallesExistentes.length)
          console.log('📋 Lista de detalles:', detallesExistentes)
          
          // Eliminar cada detalle individualmente usando el endpoint DELETE /:id
          let eliminacionExitosa = true
          for (const detalle of detallesExistentes) {
            try {
              console.log('🗑️ Eliminando detalle ID:', detalle._id)
              const deleteResponse = await fetch(getApiUrl(`/api/venta-detalle/${detalle._id}`), {
                method: 'DELETE'
              })
              if (deleteResponse.ok) {
                console.log('✅ Detalle eliminado exitosamente:', detalle._id)
              } else {
                console.warn('⚠️ No se pudo eliminar detalle:', detalle._id, 'Status:', deleteResponse.status)
                const errorText = await deleteResponse.text()
                console.warn('Error del servidor:', errorText)
                eliminacionExitosa = false
              }
            } catch (error) {
              console.error('❌ Error eliminando detalle individual:', detalle._id, error)
              eliminacionExitosa = false
            }
          }
          
          if (eliminacionExitosa) {
            console.log('✅ Todos los detalles anteriores eliminados exitosamente')
          } else {
            console.warn('⚠️ Algunos detalles no se pudieron eliminar completamente')
          }
          
          // Pequeña pausa para asegurar que la eliminación se complete
          await new Promise(resolve => setTimeout(resolve, 100))
        } else {
          const errorText = await detallesResponse.text()
          console.error('❌ Error al obtener detalles existentes:', errorText)
        }
      } else {
        console.log('📝 Creando nueva venta, no se eliminan detalles previos')
      }

      console.log('💾 Guardando nuevos detalles:', formData.detalles.length, 'elementos')
      
      for (const detalle of formData.detalles) {
        const detalleData = {
          ventaEncId: finalVentaId,
          productoId: detalle.productoId,
          cantidad: detalle.cantidad,
          precio: detalle.precio
          // observaciones: detalle.observaciones  // ← No se envían a BD
        }

        console.log('📦 Guardando detalle:', detalleData)

        const detalleResponse = await fetch(getApiUrl('/api/venta-detalle'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(detalleData)
        })

        if (!detalleResponse.ok) {
          console.error('❌ Error al guardar detalle:', detalle)
          const errorText = await detalleResponse.text()
          console.error('Error del servidor:', errorText)
        } else {
          const resultado = await detalleResponse.json()
          console.log('✅ Detalle guardado:', resultado)
        }
      }

      alert(modalType === 'edit' ? '✅ Pedido actualizado exitosamente' : '✅ Pedido creado exitosamente')
      
      // Crear los datos de la venta para el PDF/impresión
      const ventaParaPDF = {
        _id: finalVentaId,
        cliente: formData.cliente,
        entrega: formData.entrega,
        total: total,
        fecha: new Date().toISOString(),
        detalles: formData.detalles
      }

      // Si es creación, guardar los datos para el PDF
      if (modalType === 'create') {
        setUltimaVentaCreada(ventaParaPDF)
      }

      // Si se debe imprimir después de guardar
      if (shouldPrint) {
        console.log('🖨️ Generando PDF para abrir automáticamente...')
        try {
          const blob = await pdf(<TicketPDF venta={ventaParaPDF} />).toBlob()
          const url = URL.createObjectURL(blob)
          
          // Abrir el PDF en una nueva pestaña
          window.open(url, '_blank')
          
          // Limpiar la URL después de un tiempo para liberar memoria
          setTimeout(() => {
            URL.revokeObjectURL(url)
          }, 1000)
          
          console.log('✅ PDF generado y abierto automáticamente')
          alert('🖨️ Pedido guardado y PDF abierto para imprimir')
        } catch (error) {
          console.error('❌ Error al generar PDF:', error)
          alert('⚠️ Pedido guardado, pero hubo un error al generar el PDF')
        }
      }
      
      closeModal()
      reloadData()
    } catch (error) {
      console.error('Error al guardar pedido:', error)
      alert('❌ Error al guardar el pedido')
    }
  }

  // Función para verificar que no queden datos huérfanos
  const verificarEliminacionCompleta = async (ventaId) => {
    try {
      // Verificar que no queden venta-detalle huérfanos
      const response = await fetch(getApiUrl('/api/venta-detalle'))
      if (response.ok) {
        const todosLosDetalles = await response.json()
        const detallesHuerfanos = todosLosDetalles.filter(detalle => detalle.ventaEncId === ventaId)
        
        if (detallesHuerfanos.length > 0) {
          console.warn('⚠️ Se encontraron venta-detalle huérfanos:', detallesHuerfanos)
          // Intentar eliminarlos uno por uno
          for (const detalle of detallesHuerfanos) {
            try {
              await fetch(getApiUrl(`/api/venta-detalle/${detalle._id}`), {
                method: 'DELETE'
              })
              console.log('🗑️ Detalle huérfano eliminado:', detalle._id)
            } catch (error) {
              console.error('❌ Error eliminando detalle huérfano:', error)
            }
          }
        } else {
          console.log('✅ No se encontraron datos huérfanos')
        }
      }
    } catch (error) {
      console.error('❌ Error verificando eliminación:', error)
    }
  }

  const handleDelete = async () => {
    if (!selectedVenta) return

    const confirmDelete = window.confirm(`¿Estás seguro de que quieres eliminar el pedido de ${selectedVenta.cliente}?`)
    if (!confirmDelete) return

    try {
      const ventaId = selectedVenta._id || selectedVenta.id
      console.log('🗑️ Iniciando eliminación de venta ID:', ventaId)
      
      // PASO 1: Eliminar primero todos los venta-detalle relacionados
      console.log('🗑️ Eliminando venta-detalle...')
      const deleteDetallesResponse = await fetch(getApiUrl(`/api/venta-detalle/venta/${ventaId}`), {
        method: 'DELETE'
      })
      
      if (deleteDetallesResponse.ok) {
        const deleteResult = await deleteDetallesResponse.text()
        console.log('✅ Venta-detalle eliminados correctamente:', deleteResult)
      } else {
        const errorText = await deleteDetallesResponse.text()
        console.warn('⚠️ Respuesta al eliminar detalles:', deleteDetallesResponse.status, errorText)
        console.warn('⚠️ No se pudieron eliminar algunos detalles, continuando...')
      }
      
      // PASO 2: Eliminar el venta-encabezado
      console.log('🗑️ Eliminando venta-encabezado...')
      const deleteVentaResponse = await fetch(getApiUrl(`/api/venta-encabezado/${ventaId}`), {
        method: 'DELETE'
      })
      
      if (deleteVentaResponse.ok) {
        console.log('✅ Venta-encabezado eliminado correctamente')
        
        // Verificar que no queden datos huérfanos
        await verificarEliminacionCompleta(ventaId)
        
        alert('✅ Pedido eliminado exitosamente (encabezado y detalles)')
        closeModal()
        reloadData() // Recargar la lista de ventas
      } else {
        throw new Error(`Error al eliminar venta-encabezado: ${deleteVentaResponse.status} - ${deleteVentaResponse.statusText}`)
      }
    } catch (error) {
      console.error('❌ Error al eliminar venta:', error)
      alert(`❌ Error al eliminar la venta: ${error.message}`)
    }
  }

  const formatearFecha = (fecha) => {
    const fechaObj = new Date(fecha)
    const hoy = new Date()
    const ayer = new Date(hoy)
    ayer.setDate(hoy.getDate() - 1)

    const esMismoDia = (fecha1, fecha2) => {
      return fecha1.getDate() === fecha2.getDate() &&
             fecha1.getMonth() === fecha2.getMonth() &&
             fecha1.getFullYear() === fecha2.getFullYear()
    }

    if (esMismoDia(fechaObj, hoy)) {
      return `Hoy, ${fechaObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
    } else if (esMismoDia(fechaObj, ayer)) {
      return `Ayer, ${fechaObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
    } else {
      return fechaObj.toLocaleDateString('es-MX', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  // Función para generar y descargar PDF
  const generarTicketPDF = async (venta, detalles) => {
    try {
      console.log('� Generando PDF para ticket...')
      
      // Generar el PDF
      const pdfBlob = await pdf(<TicketPDF venta={venta} detalles={detalles} />).toBlob()
      
      // Crear URL del blob y descargar
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `ticket-${venta.cliente}-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      console.log('✅ PDF generado y descargado correctamente')
    } catch (error) {
      console.error('❌ Error al generar PDF:', error)
      alert(`❌ Error al generar PDF: ${error.message}`)
    }
  }

  // Función para abrir PDF en nueva ventana
  const verTicketPDF = async (venta, detalles) => {
    try {
      console.log('�️ Abriendo PDF en nueva ventana...')
      
      // Generar el PDF
      const pdfBlob = await pdf(<TicketPDF venta={venta} detalles={detalles} />).toBlob()
      
      // Crear URL del blob y abrir en nueva ventana
      const url = URL.createObjectURL(pdfBlob)
      window.open(url, '_blank')
      
      console.log('✅ PDF abierto en nueva ventana')
    } catch (error) {
      console.error('❌ Error al abrir PDF:', error)
      alert(`❌ Error al abrir PDF: ${error.message}`)
    }
  }

  // Función para generar PDF de la última venta creada
  const generarPDFUltimaVenta = async () => {
    if (!ultimaVentaCreada) {
      alert('No hay ninguna venta recién creada para generar PDF')
      return
    }
    
    try {
      console.log('🗃️ Generando PDF de la venta recién creada...')
      await verTicketPDF(ultimaVentaCreada, ultimaVentaCreada.detalles)
    } catch (error) {
      console.error('❌ Error al generar PDF:', error)
      alert(`❌ Error al generar PDF: ${error.message}`)
    }
  }

  const filtrarVentasPorFecha = (ventas) => {
    if (!ventas) return []
    
    const hoy = new Date()
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
    const inicioSemana = new Date(hoy)
    inicioSemana.setDate(hoy.getDate() - hoy.getDay())
    inicioSemana.setHours(0, 0, 0, 0)
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    
    return ventas.filter(venta => {
      const fechaVenta = new Date(venta.fecha)
      
      switch(filtroFecha) {
        case 'hoy':
          return fechaVenta >= inicioHoy
        case 'semana':
          return fechaVenta >= inicioSemana
        case 'mes':
          return fechaVenta >= inicioMes
        default:
          return true
      }
    })
  }

  const ventasFiltradas = filtrarVentasPorFecha(ventas || []).filter(venta => {
    const cumpleBusqueda = !searchTerm || 
      venta.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venta.entrega.toLowerCase().includes(searchTerm.toLowerCase())
    
    const cumpleEntrega = !filtroEntrega || venta.entrega === filtroEntrega
    
    return cumpleBusqueda && cumpleEntrega
  })

  const calcularTotalFiltrado = () => {
    return ventasFiltradas.reduce((total, venta) => total + (venta.total || 0), 0)
  }

  // Opciones de entrega según el esquema de la base de datos
  const opcionesEntrega = [
    'domicilio 1',
    'domicilio 2', 
    'recoger en comedor',
    'comer en el lugar'
  ]

  // Función para obtener el icono de entrega
  const obtenerIconoEntrega = (tipoEntrega) => {
    const iconos = {
      'recoger en comedor': '🏪',
      'comer en el lugar': '🍽️',
      'domicilio 1': '🚗',
      'domicilio 2': '🛵'
    }
    return iconos[tipoEntrega] || '🚚'
  }

  const productosFiltrados = productos?.filter(producto =>
    producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) && 
    producto.disponibilidad === true
  ) || []

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
          <div className="filters-container">
            <select
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="filter-select"
            >
              <option value="hoy">📅 Hoy</option>
              <option value="semana">📅 Esta semana</option>
              <option value="mes">📅 Este mes</option>
              <option value="todos">📅 Todos</option>
            </select>
            <select
              value={filtroEntrega}
              onChange={(e) => setFiltroEntrega(e.target.value)}
              className="filter-select"
            >
              <option value="">🚚 Todos los tipos de entrega</option>
              {opcionesEntrega.map(opcion => (
                <option key={opcion} value={opcion}>
                  {obtenerIconoEntrega(opcion)} {opcion.charAt(0).toUpperCase() + opcion.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="action-buttons">
            <button onClick={() => openModal('create')} className="btn-primary">
              ➕ Nuevo Pedido
            </button>
          </div>
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
          <p className="total-amount">{calcularTotalFiltrado().toFixed(2)}</p>
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
                <p><strong>Entrega:</strong> {obtenerIconoEntrega(venta.entrega)} {venta.entrega.charAt(0).toUpperCase() + venta.entrega.slice(1)}</p>
                <p><strong>Total:</strong> <span className="total">${venta.total.toFixed(2)}</span></p>
              </div>
              <div className="venta-actions">
                <button onClick={() => openModal('view', venta)} className="btn-secondary btn-small">
                  👁️ Ver
                </button>
                <button onClick={() => openModal('edit', venta)} className="btn-primary btn-small">
                  ✏️ Editar
                </button>
                <button 
                  onClick={async () => {
                    const detalles = await cargarDetallesVenta(venta._id || venta.id)
                    verTicketPDF(venta, detalles)
                  }} 
                  className="btn-info btn-small"
                  title="Ver ticket en PDF (58mm)"
                >
                  🗃️ PDF
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
                      onChange={(e) => setFormData(prev => ({ ...prev, cliente: e.target.value }))}
                      placeholder="Nombre del cliente"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Tipo de entrega:</label>
                    <select
                      value={formData.entrega}
                      onChange={(e) => setFormData(prev => ({ ...prev, entrega: e.target.value }))}
                    >
                      <option value="recoger en comedor">🏪 Recoger en comedor</option>
                      <option value="comer en el lugar">🍽️ Comer en el lugar</option>
                      <option value="domicilio 1">🚶‍♀️ Domicilio 1</option>
                      <option value="domicilio 2">🛵 Domicilio 2</option>
                    </select>
                  </div>

                  <div className="productos-section">
                    <h3>Productos del pedido:</h3>
                    
                    <div className="add-product-form">
                      <select
                        value={selectedProducto}
                        onChange={(e) => setSelectedProducto(e.target.value)}
                      >
                        <option value="">Seleccionar producto...</option>
                        {productos?.filter(producto => producto.disponibilidad === true).map(producto => (
                          <option key={producto._id} value={producto._id}>
                            {producto.nombre} - ${producto.precio}
                          </option>
                        ))}
                      </select>
                      
                      <input
                        type="number"
                        min="1"
                        value={cantidad}
                        onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                        placeholder="Cantidad"
                      />
                      
                      <button type="button" onClick={addProduct} className="btn-add">
                        ➕ Agregar
                      </button>
                    </div>

                    <div className="productos-list">
                      {formData.detalles.map((detalle, index) => (
                        <div key={detalle.id} className="producto-item">
                          <div className="producto-info">
                            <span className="producto-nombre">{detalle.nombre}</span>
                            <span className="producto-cantidad">Cantidad: {detalle.cantidad}</span>
                            <span className="producto-precio">Precio: ${detalle.precio}</span>
                            <span className="producto-subtotal">Subtotal: ${(detalle.cantidad * detalle.precio).toFixed(2)}</span>
                          </div>
                          <div className="producto-observaciones">
                            <input
                              type="text"
                              placeholder="Observaciones (opcional)"
                              value={detalle.observaciones}
                              onChange={(e) => updateObservaciones(index, e.target.value)}
                            />
                          </div>
                          <button 
                            type="button" 
                            onClick={() => removeProduct(index)}
                            className="btn-remove"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="total-section">
                      <h3>Total: ${calcularTotal().toFixed(2)}</h3>
                    </div>
                  </div>
                </div>
              )}

              {modalType === 'view' && selectedVenta && (
                <div className="view-container">
                  <div className="venta-info-detailed">
                    <p><strong>Cliente:</strong> {selectedVenta.cliente}</p>
                    <p><strong>Fecha:</strong> {formatearFecha(selectedVenta.fecha)}</p>
                    <p><strong>Entrega:</strong> {selectedVenta.entrega}</p>
                    <p><strong>Total:</strong> ${selectedVenta.total.toFixed(2)}</p>
                  </div>

                  <div className="detalles-section">
                    <h3>Productos del pedido:</h3>
                    {ventaDetalles.length > 0 ? (
                      <div className="detalles-list">
                        {ventaDetalles.map((detalle, index) => (
                          <div key={index} className="detalle-item">
                            <span className="detalle-nombre">{detalle.nombre}</span>
                            <span className="detalle-cantidad">x{detalle.cantidad}</span>
                            <span className="detalle-precio">${detalle.precio.toFixed(2)}</span>
                            <span className="detalle-subtotal">${(detalle.cantidad * detalle.precio).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>Cargando detalles...</p>
                    )}
                  </div>
                </div>
              )}

              {modalType === 'delete' && selectedVenta && (
                <div className="delete-container">
                  <p>¿Estás seguro de que quieres eliminar el pedido de <strong>{selectedVenta.cliente}</strong>?</p>
                  <p>Esta acción no se puede deshacer.</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {(modalType === 'create' || modalType === 'edit') && (
                <>
                  <button onClick={closeModal} className="btn-secondary">
                    Cancelar
                  </button>
                  <button onClick={handleSubmit} className="btn-primary">
                    {modalType === 'create' ? 'Crear Pedido' : 'Actualizar Pedido'}
                  </button>
                  {modalType === 'create' && (
                    <button onClick={handleSaveAndPrint} className="btn-success">
                      🖨️ Guardar e Imprimir
                    </button>
                  )}
                  {modalType === 'create' && ultimaVentaCreada && (
                    <button 
                      onClick={generarPDFUltimaVenta}
                      className="btn-info"
                      title="Generar PDF del pedido creado"
                    >
                      🗃️ Ver PDF
                    </button>
                  )}
                </>
              )}

              {modalType === 'view' && (
                <button onClick={closeModal} className="btn-secondary">
                  Cerrar
                </button>
              )}

              {modalType === 'delete' && (
                <>
                  <button onClick={closeModal} className="btn-secondary">
                    Cancelar
                  </button>
                  <button onClick={handleDelete} className="btn-danger">
                    Sí, Eliminar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Pedidos