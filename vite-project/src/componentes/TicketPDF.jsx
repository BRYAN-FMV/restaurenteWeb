import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Estilos simplificados para impresoras térmicas
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 6,
    fontSize: 9,
    fontFamily: 'Helvetica',
    width: 164,
    minHeight: 700,
  },
  header: {
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoText: {
    fontSize: 8,
    marginBottom: 1,
  },
  highlighted: {
    fontSize: 12,
    marginBottom: 2,
  },
  highlightedLarge: {
    fontSize: 14,
    marginBottom: 2,
    textAlign: 'center',
  },
  section: {
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  leftText: {
    fontSize: 9,
  },
  rightText: {
    fontSize: 9,
    textAlign: 'right',
  },
  centerText: {
    fontSize: 9,
    textAlign: 'center',
  },
  item: {
    marginBottom: 4,
  },
  itemName: {
    fontSize: 11,
    marginBottom: 1,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
  },
  observaciones: {
    fontSize: 7,
    marginTop: 1,
  },
  separator: {
    textAlign: 'center',
    fontSize: 8,
    marginVertical: 4,
  },
  total: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 6,
    marginBottom: 6,
  },
  footer: {
    textAlign: 'center',
    fontSize: 7,
    marginTop: 8,
  }
});

const TicketPDF = ({ venta, detalles = [] }) => {
  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleString('es-ES', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <Document>
      <Page size={[164, 700]} style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>COMEDOR FLORES</Text>
        </View>

        {/* Separador */}
        <Text style={styles.separator}>================================</Text>

        {/* Información del pedido */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.leftText}>Fecha:</Text>
            <Text style={styles.rightText}>{formatearFecha(venta.fecha)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.leftText}>CLIENTE:      {venta.cliente.toUpperCase()}</Text>
            <Text style={styles.highlighted}></Text>
          </View>
        </View>

        {/* Separador */}
        <Text style={styles.separator}>--------------------------------</Text>

        {/* Productos */}
        <View style={styles.section}>
          <Text style={styles.highlightedLarge}>DETALLE DEL PEDIDO</Text>
          <Text style={styles.separator}>--------------------------------</Text>
          
          {detalles.map((detalle, index) => (
            <View key={index} style={styles.item}>
              <Text style={styles.itemName}>
                {(detalle.nombre || `Producto ${detalle.productoId}`).toUpperCase()}
              </Text>
              <View style={styles.itemDetails}>
                <Text>{detalle.cantidad} x L.{detalle.precio.toFixed(2)}</Text>
                <Text>      L.{(detalle.cantidad * detalle.precio).toFixed(2)}</Text>
              </View>
              {detalle.observaciones && (
                <Text style={styles.observaciones}>
                  OBS: {detalle.observaciones.toUpperCase()}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Total */}
        <Text style={styles.separator}>================================</Text>
        <Text style={styles.total}>
          TOTAL: L.{venta.total.toFixed(2)}
        </Text>
        <Text style={styles.separator}>================================</Text>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>¡Gracias por su compra!</Text>
          <Text>COMEDOR FLORES</Text>
          <Text>Sirviendo con amor</Text>
          <Text> </Text>
          <Text> </Text>
          <Text> </Text>
        </View>
      </Page>
    </Document>
  );
};

export default TicketPDF;