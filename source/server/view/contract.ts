import { z } from "zod"

export const programReleaseRequest = z.object({
    program: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
}).strict()

export const programReleaseListRequest = z.object({
    page: z.number().int().min(1).max(1_000),
    limit: z.number().int().min(1).max(50),
    retry: z.boolean()
}).strict()
