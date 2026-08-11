import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/server";

export const dynamic = 'force-dynamic';

export async function GET(req) {
    if (!adminDb) return NextResponse.json({ error: "adminDb is null" });

    try {
        const snap = await adminDb.collection("gyms").get();
        const gyms = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const mSnap = await adminDb.collection("members").get();
        const members = mSnap.docs.map(doc => ({ id: doc.id, gymId: doc.data().gymId, email: doc.data().email }));

        // TEST EXACT QUERY
        const testCode = "GYM-GYM-1232";
        const testSnap = await adminDb.collection('gyms').where('gymCode', '==', testCode).get();
        const queryMatches = testSnap.docs.map(doc => ({ id: doc.id, gymCode: doc.data().gymCode }));

        return NextResponse.json({ gyms, members, queryMatches, queryMatchesCount: testSnap.size, testCode });
    } catch (e) {
        return NextResponse.json({ error: e.message });
    }
}
