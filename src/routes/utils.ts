import { Router } from "express";
import z from "zod";
import { Services } from "../index";

export default function utilRoutes(services: Services): Router {
  const router = Router();
  const { database } = services;

  const swapSchema = z.object({
    swaps: z
      .array(
        z.object({
          from: z.string().min(1),
          to: z.string().min(1),
        })
      )
      .nonempty(),
  });

  router.post("/swap-ref", async (req, res) => {
    try {
      const { swaps } = swapSchema.parse(req.body);

      const results: string[] = [];

      for (const { from, to } of swaps) {
        const fromParts = from.split("/");
        const toParts = to.split("/");

        const fromLast = fromParts[fromParts.length - 1];

        toParts[toParts.length - 1] = fromLast;
        const newRef = toParts.join("/");

        const fromSnap = await database.ref(from).get();

        if (!fromSnap.exists()) {
          throw new Error(`Source ref not found: ${from}`);
        }

        const value = fromSnap.val();

        await database.ref(newRef).set(value);

        await database.ref(to).remove();
        await database.ref(from).remove();

        results.push(newRef);
      }

      res.json({ results });
    } catch (err) {
      console.error("Swap error:", err);
      res.status(500).json({ error: "Failed to swap refs", details: String(err) });
    }
  });

  return router;
}
