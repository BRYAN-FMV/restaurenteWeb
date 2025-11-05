import useFetch from '../hooks/usefetch'
import { useState } from 'react'
import { getApiUrl } from '../config/api.js'
import './producto.css'

function Productos() {
  const [refreshKey, setRefreshKey] = useState(0) // Para forzar recargas
  const { data: productos, loading, error } = useFetch(`${getApiUrl('/api/productos')}?refresh=${refreshKey}`)
  const [productosDisponibilidad, setProductosDisponibilidad] = useState({})
  
  // Estados para CRUD
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('') // 'create', 'edit', 'delete'
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [formData, setFormData] = useState({
    nombre: '',
    precio: '',
    categoria: '',
    disponibilidad: true
  })
  
  // Estado para búsqueda
  const [searchTerm, setSearchTerm] = useState('')

  // Función para recargar datos
  const reloadData = () => {
    setRefreshKey(prev => prev + 1)
    // También podemos recargar la página como alternativa
    // window.location.reload()
  }

  // Función helper para obtener ID consistente
  const obtenerIdProducto = (producto, index = 0) => {
    return producto._id?.toString() || producto.id?.toString() || index.toString()
  }

  // Función para cambiar la disponibilidad localmente
  const cambiarDisponibilidad = async (productoId, nuevaDisponibilidad) => {
    try {
      console.log(`🔄 Cambiando disponibilidad del producto ${productoId} a: ${nuevaDisponibilidad}`)
      
      // Actualizar estado local inmediatamente para una mejor UX
      setProductosDisponibilidad(prev => {
        const nuevoEstado = {
          ...prev,
          [productoId]: nuevaDisponibilidad
        }
        console.log(`📊 Nuevo estado local:`, nuevoEstado)
        return nuevoEstado
      })

      // Llamada a la API para actualizar en el servidor
      const datosActualizacion = { disponibilidad: nuevaDisponibilidad } // ← Cambiado a "disponibilidad"
      console.log(`🌐 Enviando solicitud PUT a: ${getApiUrl(`/api/productos/${productoId}`)}`)
      console.log(`📦 Datos a enviar:`, datosActualizacion)
      
      const response = await fetch(getApiUrl(`/api/productos/${productoId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosActualizacion)
      })

      console.log(`📡 Respuesta del servidor:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.log(`❌ Error del servidor:`, errorText)
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log(`✅ Producto ${productoId} actualizado exitosamente:`, result)
      
    } catch (error) {
      console.error(`❌ Error al cambiar disponibilidad:`, error)
      console.log(`🔄 Revirtiendo cambio para producto ${productoId}`)
      
      // Revertir el cambio si hay error
      setProductosDisponibilidad(prev => ({
        ...prev,
        [productoId]: !nuevaDisponibilidad
      }))
    }
  }

  // Función para obtener la disponibilidad actual (local o del servidor)
  const getDisponibilidad = (producto, index = 0) => {
    const productoId = obtenerIdProducto(producto, index)
    
    // Verificar si hay override local, sino usar valor de la DB (usar "disponibilidad" de la DB)
    const disponibilidadLocal = productosDisponibilidad.hasOwnProperty(productoId) 
      ? productosDisponibilidad[productoId]
      : producto.disponibilidad // ← Cambiado a "disponibilidad"

    console.log(`🔍 Producto ${productoId}:`, {
      disponibilidadDB: producto.disponibilidad, // ← Cambiado a "disponibilidad"
      disponibilidadLocal: productosDisponibilidad[productoId],
      disponibilidadFinal: disponibilidadLocal
    })
    
    return disponibilidadLocal
  }

  // ===== FUNCIONES CRUD =====
  
  // Función para resetear el formulario
  const resetForm = () => {
    setFormData({
      nombre: '',
      precio: '',
      categoria: '',
      disponibilidad: true
    })
  }

  // Función para abrir modal de crear
  const openCreateModal = () => {
    resetForm()
    setModalType('create')
    setShowModal(true)
  }

  // Función para abrir modal de editar
  const openEditModal = (producto) => {
    setFormData({
      nombre: producto.nombre || '',
      precio: producto.precio || '',
      categoria: producto.categoria || '',
      disponibilidad: producto.disponibilidad || true
    })
    setSelectedProduct(producto)
    setModalType('edit')
    setShowModal(true)
  }

  // Función para abrir modal de eliminar
  const openDeleteModal = (producto) => {
    setSelectedProduct(producto)
    setModalType('delete')
    setShowModal(true)
  }

  // Función para cerrar modal
  const closeModal = () => {
    setShowModal(false)
    setModalType('')
    setSelectedProduct(null)
    resetForm()
  }

  // Función para crear producto
  const createProduct = async () => {
    try {
      const response = await fetch(getApiUrl('/api/productos'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoProducto)
      })

      if (!response.ok) throw new Error('Error al crear producto')
      
      await reloadData() // Recargar la lista
      closeModal()
      console.log('✅ Producto creado exitosamente')
    } catch (error) {
      console.error('❌ Error al crear producto:', error)
    }
  }

  // Función para actualizar producto
  const updateProduct = async () => {
    try {
      const productoId = obtenerIdProducto(selectedProduct)
      const response = await fetch(getApiUrl(`/api/productos/${productoId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Error al actualizar producto')
      
      await reloadData() // Recargar la lista
      closeModal()
      console.log('✅ Producto actualizado exitosamente')
    } catch (error) {
      console.error('❌ Error al actualizar producto:', error)
    }
  }

  // Función para eliminar producto
  const deleteProduct = async () => {
    try {
      const productoId = obtenerIdProducto(selectedProduct)
      const response = await fetch(getApiUrl(`/api/productos/${productoId}`), {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Error al eliminar producto')
      
      await reloadData() // Recargar la lista
      closeModal()
      console.log('✅ Producto eliminado exitosamente')
    } catch (error) {
      console.error('❌ Error al eliminar producto:', error)
    }
  }

  // Función para manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  // Función para filtrar productos según el término de búsqueda
  const filteredProducts = Array.isArray(productos) ? productos.filter(producto => {
    const searchLower = searchTerm.toLowerCase()
    return (
      (producto.nombre?.toLowerCase().includes(searchLower)) ||
      (producto.categoria?.toLowerCase().includes(searchLower)) ||
      (producto.precio?.toString().includes(searchTerm))
    )
  }) : []

  // Función para limpiar búsqueda
  const clearSearch = () => {
    setSearchTerm('')
  }

  return (
    <div className="productos-section">
      <div className="productos-header">
        <h2>Productos del Restaurante</h2>
        <button className="btn-add-product" onClick={openCreateModal}>
          ➕ Agregar Producto
        </button>
      </div>
      
      {/* Barra de búsqueda */}
      <div className="search-container">
        <div className="search-bar">
          <input
            type="text"
            placeholder="🔍 Buscar productos por nombre, categoría o precio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="clear-search-btn"
              onClick={clearSearch}
              title="Limpiar búsqueda"
            >
              ✖️
            </button>
          )}
        </div>
        {searchTerm && (
          <div className="search-info">
            <span className="search-results">
              {filteredProducts.length} de {productos.length} productos encontrados
            </span>
          </div>
        )}
      </div>
      
      {loading && <p className="loading-message">Cargando productos...</p>}
      {error && <p className="error-message">Error: {error.message}</p>}
      {productos && (
        <div className="productos-container">
          <h3>
            Lista de Productos ({filteredProducts.length} 
            {searchTerm ? ` de ${productos.length}` : ''} productos)
          </h3>
          <div className="productos-grid">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((producto, index) => {
                const productoId = obtenerIdProducto(producto, index)
                const disponibilidadActual = getDisponibilidad(producto, index)
                
                console.log(`🎨 Renderizando producto ${productoId}:`, { 
                  disponibilidadOriginal: producto.disponible, 
                  disponibilidadActual,
                  estadoLocal: productosDisponibilidad
                })
                
                return (
                  <div key={productoId} className="producto-card">
                    <div className="producto-header">
                      <h4 className="producto-nombre">{producto.nombre || producto.name || 'Sin nombre'}</h4>
                      <div className="disponibilidad-switch-container">
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={disponibilidadActual}
                            onChange={(e) => {
                              console.log(`🔄 Switch clicked para producto ${productoId}:`, e.target.checked)
                              cambiarDisponibilidad(productoId, e.target.checked)
                            }}
                          />
                          <span className="slider"></span>
                        </label>
                        <span className={`disponibilidad-label ${disponibilidadActual ? 'disponible' : 'no-disponible'}`}>
                          {disponibilidadActual ? 'Disponible' : 'No disponible'}
                        </span>
                      </div>
                    </div>
                    
                    <p className="producto-precio">
                      <span className="precio-label">Precio: </span>
                      <span className="precio-valor">
                        L.{producto.precio}
                      </span>
                    </p>
                    {producto.categoria && (
                      <p className="producto-categoria">
                        <span className="categoria-tag">{producto.categoria}</span>
                      </p>
                    )}
                    
                    {/* Botones de acción CRUD */}
                    <div className="producto-actions">
                      <button 
                        className="btn-edit"
                        onClick={() => openEditModal(producto)}
                        title="Editar producto"
                      >
                        ✏️ Editar
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => openDeleteModal(producto)}
                        title="Eliminar producto"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="no-results">
                {searchTerm ? (
                  <div className="no-search-results">
                    <h4>🔍 No se encontraron productos</h4>
                    <p>No hay productos que coincidan con "{searchTerm}"</p>
                    <button className="btn-clear-search" onClick={clearSearch}>
                      Limpiar búsqueda
                    </button>
                  </div>
                ) : (
                  <div className="no-array-data">
                    <h4>No hay productos disponibles</h4>
                    <p>Agrega tu primer producto haciendo clic en "Agregar Producto"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal para CRUD */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modalType === 'create' && '➕ Crear Nuevo Producto'}
                {modalType === 'edit' && '✏️ Editar Producto'}
                {modalType === 'delete' && '🗑️ Eliminar Producto'}
              </h3>
              <button className="modal-close" onClick={closeModal}>✖️</button>
            </div>

            <div className="modal-body">
              {modalType === 'delete' ? (
                <div className="delete-confirmation">
                  <p>¿Estás seguro de que deseas eliminar el producto:</p>
                  <strong>"{selectedProduct?.nombre}"</strong>
                  <p>Esta acción no se puede deshacer.</p>
                </div>
              ) : (
                <form className="product-form">
                  <div className="form-group">
                    <label htmlFor="nombre">Nombre del producto:</label>
                    <input
                      type="text"
                      id="nombre"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      placeholder="Ej: Pizza Margherita"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="precio">Precio:</label>
                    <input
                      type="number"
                      id="precio"
                      name="precio"
                      value={formData.precio}
                      onChange={handleInputChange}
                      placeholder="Ej: 150"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="categoria">Categoría:</label>
                    <input
                      type="text"
                      id="categoria"
                      name="categoria"
                      value={formData.categoria}
                      onChange={handleInputChange}
                      placeholder="Ej: Pizzas, Bebidas, Postres"
                    />
                  </div>

                  <div className="form-group checkbox-group">
                    <label htmlFor="disponibilidad">
                      <input
                        type="checkbox"
                        id="disponibilidad"
                        name="disponibilidad"
                        checked={formData.disponibilidad}
                        onChange={handleInputChange}
                      />
                      Producto disponible
                    </label>
                  </div>
                </form>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeModal}>
                Cancelar
              </button>
              {modalType === 'create' && (
                <button className="btn-confirm" onClick={createProduct}>
                  ➕ Crear Producto
                </button>
              )}
              {modalType === 'edit' && (
                <button className="btn-confirm" onClick={updateProduct}>
                  💾 Guardar Cambios
                </button>
              )}
              {modalType === 'delete' && (
                <button className="btn-danger" onClick={deleteProduct}>
                  🗑️ Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Productos
