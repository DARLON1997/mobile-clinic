import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Droplets, AlertTriangle, Activity } from "lucide-react"

interface MedicalRecordProps {
  profile: {
    dateOfBirth:     Date | null
    bloodType:       string | null
    gender:          string | null
    allergies:       string | null
    medicalHistory: string | null
    address:         string | null
    city:            string | null
  }
  patientName: string | null
}

export function MedicalRecord({ profile, patientName }: MedicalRecordProps) {
  const age = profile.dateOfBirth
    ? Math.floor((Date.now() - profile.dateOfBirth.getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  return (
    <div className="space-y-4">
      {/* Identité */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Informations personnelles
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-gray-500">Nom complet</p>
            <p className="font-medium text-gray-900">{patientName ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Âge</p>
            <p className="font-medium text-gray-900">{age ? `${age} ans` : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Genre</p>
            <p className="font-medium text-gray-900">
              {profile.gender === "M" ? "Masculin" : profile.gender === "F" ? "Féminin" : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Adresse</p>
            <p className="font-medium text-gray-900">
              {profile.address ? `${profile.address}, ${profile.city ?? ""}` : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Groupe sanguin */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-red-500" />
            Groupe sanguin
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profile.bloodType ? (
            <Badge className="text-base px-4 py-1">{profile.bloodType}</Badge>
          ) : (
            <p className="text-sm text-gray-500">Non renseigné</p>
          )}
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Allergies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {profile.allergies || <span className="text-gray-400">Aucune allergie renseignée</span>}
          </p>
        </CardContent>
      </Card>

      {/* Maladies chroniques */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-500" />
            Antécédents / Maladies chroniques
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {profile.medicalHistory || <span className="text-gray-400">Aucun antécédent renseigné</span>}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
