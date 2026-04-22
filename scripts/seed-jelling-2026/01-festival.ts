import {
  ensureDefaultOrg,
  insertFestival,
} from "../../server/planDb";
import { festivalDate, JELLING_SLUG } from "./_shared";

export async function seedFestival(): Promise<number> {
  const orgId = await ensureDefaultOrg();
  const festivalId = await insertFestival({
    orgId,
    slug: JELLING_SLUG,
    name: "Jelling Musikfestival",
    year: 2026,
    startDate: festivalDate("2026-05-21"),
    endDate: festivalDate("2026-05-24"),
    location: "Mølvangvej 66B, 7300 Jelling",
    organiserName: "Jonas Kring (Jelling Musikfestival)",
    organiserPhone: "+45 22 96 91 61",
    organiserEmail: null,
    status: "planning",
    driveFolderId: "1C6xyUvondxS67EDcBbUPEyuXuJwgW4ky",
  });
  return festivalId;
}
