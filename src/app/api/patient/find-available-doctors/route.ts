import { NextResponse }        from "next/server"
import { auth }                from "@/auth"
import { z }                   from "zod"
import { findAvailableDoctors } from "@/lib/weekly-schedule"
import { logServerError }       from "@/lib/error-logger"

const schema = z.object({
  type:       z.enum(["VIDEO", "PRESENTIEL"]),
  dateTime:   z.string().datetime(),
  speciality: z.string().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  try {
    const body = schema.parse(await req.json())
    const dateTime = new Date(body.dateTime)

    const doctors = await findAvailableDoctors(body.type, dateTime, body.speciality)
    return NextResponse.json({ success: true, data: doctors })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 })
    }
    logServerError("FIND_AVAILABLE_DOCTORS", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
