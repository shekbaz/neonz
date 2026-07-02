import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { registerSchema } from "@/lib/validators/auth.schema";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();

  const existing = await User.findOne({ email: parsed.data.email });
  if (existing) {
    return NextResponse.json({ error: "Un compte existe déjà avec cet e-mail." }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12);
  const user = await User.create({
    name: parsed.data.name,
    email: parsed.data.email,
    password: hashedPassword,
    role: "client",
  });

  return NextResponse.json(
    { id: user._id.toString(), name: user.name, email: user.email },
    { status: 201 }
  );
}
