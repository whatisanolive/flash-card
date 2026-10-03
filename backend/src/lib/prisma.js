import { PrismaClient } from '@prisma/client'

// One shared client for the whole process (Prisma manages its own pool).
const prisma = new PrismaClient()

export default prisma
