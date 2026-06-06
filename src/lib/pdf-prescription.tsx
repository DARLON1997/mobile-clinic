import React from "react"
import {
  Document, Page, Text, View, StyleSheet, renderToBuffer,
} from "@react-pdf/renderer"
import { formatDate, generatePrescriptionNumber } from "@/lib/utils"

// Re-export helper so route can call it
export { generatePrescriptionNumber }

export type PrescriptionData = {
  prescriptionNumber: string
  consultationDate:   Date
  doctor: {
    firstName:     string
    lastName:      string
    licenseNumber: string
    speciality:    string
  }
  patient: {
    firstName:   string
    lastName:    string
    dateOfBirth: Date
  }
  diagnosis:     string | null | undefined
  clinicalNotes: string | null | undefined
  items: Array<{
    medication:   string
    dosage:       string
    duration:     string
    instructions: string
  }>
  followUpDate?: Date | null
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#111111",
  },
  watermark: {
    position: "absolute",
    top: 300,
    left: 60,
    fontSize: 72,
    color: "#f0f4f8",
    transform: "rotate(-40deg)",
  },
  header: {
    backgroundColor: "#1e5fa8",
    padding: 16,
    marginBottom: 16,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 22,
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
  },
  headerSubtitle: {
    fontSize: 9,
    color: "#c8d8f0",
    marginTop: 3,
  },
  rxNumber: {
    fontSize: 9,
    color: "#888888",
    textAlign: "right",
    marginBottom: 12,
  },
  section: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottom: "1px solid #f0f0f0",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1e5fa8",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  metaLabel: {
    width: 130,
    color: "#666666",
    fontSize: 9,
  },
  metaValue: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  medItem: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 3,
    borderLeft: "3px solid #1e5fa8",
  },
  medName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    marginBottom: 3,
  },
  medDetail: {
    fontSize: 9,
    color: "#555555",
    marginBottom: 2,
  },
  notesText: {
    fontSize: 9,
    color: "#444444",
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    borderTop: "1px solid #e5e7eb",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: "#9ca3af",
  },
})

function PrescriptionDocument({ data }: { data: PrescriptionData }) {
  const age = Math.floor(
    (Date.now() - data.patient.dateOfBirth.getTime()) / (365.25 * 24 * 3600 * 1000)
  )

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Filigrane */}
        <Text style={styles.watermark}>Mobile Clinic</Text>

        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mobile Clinic</Text>
          <Text style={styles.headerSubtitle}>
            Plateforme de télémédecine — Congo-Brazzaville
          </Text>
        </View>

        {/* Numéro */}
        <Text style={styles.rxNumber}>
          Ordonnance N° {data.prescriptionNumber} — {formatDate(data.consultationDate)}
        </Text>

        {/* Médecin */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Médecin prescripteur</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Nom :</Text>
            <Text style={styles.metaValue}>
              Dr {data.doctor.firstName} {data.doctor.lastName}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Spécialité :</Text>
            <Text style={styles.metaValue}>{data.doctor.speciality}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>N° Licence :</Text>
            <Text style={styles.metaValue}>{data.doctor.licenseNumber}</Text>
          </View>
        </View>

        {/* Patient */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Nom complet :</Text>
            <Text style={styles.metaValue}>
              {data.patient.firstName} {data.patient.lastName}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Date de naissance :</Text>
            <Text style={styles.metaValue}>{formatDate(data.patient.dateOfBirth)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Âge :</Text>
            <Text style={styles.metaValue}>{age} ans</Text>
          </View>
        </View>

        {/* Diagnostic */}
        {!!data.diagnosis && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Diagnostic</Text>
            <Text style={styles.notesText}>{data.diagnosis}</Text>
          </View>
        )}

        {/* Médicaments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Médicaments prescrits</Text>
          {data.items.map((item, i) => (
            <View key={i} style={styles.medItem}>
              <Text style={styles.medName}>{i + 1}. {item.medication}</Text>
              <Text style={styles.medDetail}>Posologie : {item.dosage}</Text>
              <Text style={styles.medDetail}>Durée : {item.duration}</Text>
              <Text style={styles.medDetail}>Instructions : {item.instructions}</Text>
            </View>
          ))}
        </View>

        {/* Notes cliniques */}
        {!!data.clinicalNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes cliniques</Text>
            <Text style={styles.notesText}>{data.clinicalNotes}</Text>
          </View>
        )}

        {/* Suivi */}
        {!!data.followUpDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prochain suivi recommandé</Text>
            <Text style={styles.notesText}>{formatDate(data.followUpDate)}</Text>
          </View>
        )}

        {/* Pied de page */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Document généré électroniquement — Mobile Clinic
          </Text>
          <Text style={styles.footerText}>
            Votre santé, notre priorité — mobileclinic.cg
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generatePrescriptionPDF(data: PrescriptionData): Promise<Buffer> {
  return renderToBuffer(<PrescriptionDocument data={data} />)
}
