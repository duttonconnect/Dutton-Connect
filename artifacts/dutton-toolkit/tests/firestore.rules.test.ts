import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "test-project",
    firestore: {
      rules: readFileSync(
        resolve(__dirname, "../firestore.rules"),
        "utf-8"
      ),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

// ─── helpers ─────────────────────────────────────────────────────────────────

function unauthed() {
  return testEnv.unauthenticatedContext();
}

function authed(uid: string) {
  return testEnv.authenticatedContext(uid);
}

async function seedDoc(path: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data);
  });
}

/**
 * Seeds users/{uid} with isAdmin: true (bypassing rules) so that the
 * isAdmin() helper in firestore.rules resolves to true, then returns
 * a regular authenticated context for that uid.
 */
async function seedAdminAndGetContext(uid: string) {
  await seedDoc(`users/${uid}`, { isAdmin: true, displayName: "Admin", role: "admin" });
  return authed(uid);
}

// ─── routes ──────────────────────────────────────────────────────────────────

describe("routes collection", () => {
  const ownerUid = "user-owner";
  const otherUid = "user-other";
  const routeId = "route-1";
  const routePath = `routes/${routeId}`;
  const routeData = { userId: ownerUid, name: "Test Route", stops: [] };

  describe("unauthenticated access", () => {
    it("denies unauthenticated read", async () => {
      await seedDoc(routePath, routeData);
      await assertFails(getDoc(doc(unauthed().firestore(), routePath)));
    });

    it("denies unauthenticated create", async () => {
      await assertFails(
        setDoc(doc(unauthed().firestore(), routePath), routeData)
      );
    });

    it("denies unauthenticated update", async () => {
      await seedDoc(routePath, routeData);
      await assertFails(
        updateDoc(doc(unauthed().firestore(), routePath), { name: "Updated" })
      );
    });

    it("denies unauthenticated delete", async () => {
      await seedDoc(routePath, routeData);
      await assertFails(deleteDoc(doc(unauthed().firestore(), routePath)));
    });
  });

  describe("owner access", () => {
    it("allows owner to read their own route", async () => {
      await seedDoc(routePath, routeData);
      await assertSucceeds(
        getDoc(doc(authed(ownerUid).firestore(), routePath))
      );
    });

    it("allows owner to create a route with their own userId", async () => {
      await assertSucceeds(
        setDoc(doc(authed(ownerUid).firestore(), routePath), routeData)
      );
    });

    it("allows owner to update their own route (without changing userId)", async () => {
      await seedDoc(routePath, routeData);
      await assertSucceeds(
        updateDoc(doc(authed(ownerUid).firestore(), routePath), {
          name: "Renamed Route",
          userId: ownerUid,
        })
      );
    });

    it("denies owner from changing userId on update (ownership transfer)", async () => {
      await seedDoc(routePath, routeData);
      await assertFails(
        updateDoc(doc(authed(ownerUid).firestore(), routePath), {
          userId: otherUid,
        })
      );
    });

    it("allows owner to delete their own route", async () => {
      await seedDoc(routePath, routeData);
      await assertSucceeds(
        deleteDoc(doc(authed(ownerUid).firestore(), routePath))
      );
    });
  });

  describe("non-owner authenticated access", () => {
    it("denies another user from reading someone else's route", async () => {
      await seedDoc(routePath, routeData);
      await assertFails(
        getDoc(doc(authed(otherUid).firestore(), routePath))
      );
    });

    it("denies another user from creating a route with someone else's userId", async () => {
      await assertFails(
        setDoc(doc(authed(otherUid).firestore(), routePath), routeData)
      );
    });

    it("denies another user from updating someone else's route", async () => {
      await seedDoc(routePath, routeData);
      await assertFails(
        updateDoc(doc(authed(otherUid).firestore(), routePath), {
          name: "Hacked",
          userId: otherUid,
        })
      );
    });

    it("denies another user from deleting someone else's route", async () => {
      await seedDoc(routePath, routeData);
      await assertFails(
        deleteDoc(doc(authed(otherUid).firestore(), routePath))
      );
    });
  });
});

// ─── businessProfiles ────────────────────────────────────────────────────────

describe("businessProfiles collection", () => {
  const proUid = "pro-user";
  const otherUid = "other-user";
  const profilePath = `businessProfiles/${proUid}`;
  const profileData = {
    businessName: "Smith Plumbing",
    ownerName: "Joe Smith",
    serviceCategories: ["Plumbing"],
    serviceArea: "Atlanta, GA",
    serviceRadius: 25,
    about: "15 years experience.",
    yearsExperience: 15,
    updatedAt: new Date().toISOString(),
  };

  it("allows the owner to create their own business profile", async () => {
    await assertSucceeds(
      setDoc(doc(authed(proUid).firestore(), profilePath), profileData)
    );
  });

  it("allows the owner to update their own business profile", async () => {
    await seedDoc(profilePath, profileData);
    await assertSucceeds(
      setDoc(doc(authed(proUid).firestore(), profilePath), { ...profileData, about: "Updated bio." }, { merge: true })
    );
  });

  it("allows the owner to read their own business profile", async () => {
    await seedDoc(profilePath, profileData);
    await assertSucceeds(getDoc(doc(authed(proUid).firestore(), profilePath)));
  });

  it("denies another authenticated user from reading someone else's business profile", async () => {
    await seedDoc(profilePath, profileData);
    await assertFails(getDoc(doc(authed(otherUid).firestore(), profilePath)));
  });

  it("denies another user from creating a business profile under a different UID", async () => {
    await assertFails(
      setDoc(doc(authed(otherUid).firestore(), profilePath), profileData)
    );
  });

  it("denies another user from updating someone else's business profile", async () => {
    await seedDoc(profilePath, profileData);
    await assertFails(
      setDoc(doc(authed(otherUid).firestore(), profilePath), { ...profileData, about: "Hacked." }, { merge: true })
    );
  });

  it("denies unauthenticated read", async () => {
    await seedDoc(profilePath, profileData);
    await assertFails(getDoc(doc(unauthed().firestore(), profilePath)));
  });

  it("denies unauthenticated write", async () => {
    await assertFails(
      setDoc(doc(unauthed().firestore(), profilePath), profileData)
    );
  });

  it("allows admin to read any business profile", async () => {
    const adminCtx = await seedAdminAndGetContext("admin-bp");
    await seedDoc(profilePath, profileData);
    await assertSucceeds(getDoc(doc(adminCtx.firestore(), profilePath)));
  });

  it("allows admin to delete a business profile", async () => {
    const adminCtx = await seedAdminAndGetContext("admin-bp-del");
    await seedDoc(profilePath, profileData);
    await assertSucceeds(deleteDoc(doc(adminCtx.firestore(), profilePath)));
  });

  it("denies a non-admin owner from deleting their own business profile", async () => {
    await seedDoc(profilePath, profileData);
    await assertFails(deleteDoc(doc(authed(proUid).firestore(), profilePath)));
  });
});

// ─── users ────────────────────────────────────────────────────────────────────

describe("users collection", () => {
  const ownerUid = "user-a";
  const otherUid = "user-b";
  const userPath = `users/${ownerUid}`;
  const userDoc = {
    displayName: "Alice",
    isAdmin: false,
    role: "pro",
  };

  it("allows the document owner to read their own user document", async () => {
    await seedDoc(userPath, userDoc);
    await assertSucceeds(getDoc(doc(authed(ownerUid).firestore(), userPath)));
  });

  it("denies another authenticated user from reading someone else's user document", async () => {
    await seedDoc(userPath, userDoc);
    await assertFails(getDoc(doc(authed(otherUid).firestore(), userPath)));
  });

  it("denies unauthenticated user from reading a user document", async () => {
    await seedDoc(userPath, userDoc);
    await assertFails(getDoc(doc(unauthed().firestore(), userPath)));
  });

  it("allows an admin to read any user document (including sensitive fields)", async () => {
    const adminUid = "admin-user-read";
    const adminCtx = await seedAdminAndGetContext(adminUid);
    await seedDoc(userPath, userDoc);
    await assertSucceeds(getDoc(doc(adminCtx.firestore(), userPath)));
  });

  it("allows owner to create their own profile (without isAdmin)", async () => {
    await assertSucceeds(
      setDoc(doc(authed(ownerUid).firestore(), userPath), {
        displayName: "Alice",
        role: "pro",
      })
    );
  });

  it("denies owner from claiming isAdmin=true during create", async () => {
    await assertFails(
      setDoc(doc(authed(ownerUid).firestore(), userPath), {
        displayName: "Alice",
        isAdmin: true,
        role: "pro",
      })
    );
  });

  it("allows owner to create with isAdmin explicitly false", async () => {
    await assertSucceeds(
      setDoc(doc(authed(ownerUid).firestore(), userPath), {
        displayName: "Alice",
        isAdmin: false,
        role: "pro",
      })
    );
  });

  it("denies another user from creating someone else's profile", async () => {
    await assertFails(
      setDoc(doc(authed(otherUid).firestore(), userPath), {
        displayName: "Alice",
        isAdmin: false,
        role: "pro",
      })
    );
  });

  it("allows owner to update their profile without changing isAdmin", async () => {
    await seedDoc(userPath, userDoc);
    await assertSucceeds(
      updateDoc(doc(authed(ownerUid).firestore(), userPath), {
        displayName: "Alice Updated",
        isAdmin: false,
        role: "pro",
      })
    );
  });

  it("allows owner to change their own role field (pro/customer switching)", async () => {
    // role is "pro" or "customer" — not a privilege escalation.
    // Users must be able to switch modes for the dual-role feature to work.
    await seedDoc(userPath, userDoc);
    await assertSucceeds(
      updateDoc(doc(authed(ownerUid).firestore(), userPath), {
        displayName: "Alice Updated",
        isAdmin: false,
        role: "customer",
      })
    );
  });

  it("denies owner from changing their isAdmin field", async () => {
    await seedDoc(userPath, userDoc);
    await assertFails(
      updateDoc(doc(authed(ownerUid).firestore(), userPath), {
        displayName: "Alice Updated",
        isAdmin: true,
        role: "pro",
      })
    );
  });

  describe("admin privilege changes", () => {
    const adminUid = "admin-user";
    const targetUid = "target-user";
    const targetPath = `users/${targetUid}`;
    const targetDoc = { displayName: "Bob", isAdmin: false, role: "pro" };

    it("allows an admin to grant isAdmin=true to another user", async () => {
      const adminCtx = await seedAdminAndGetContext(adminUid);
      await seedDoc(targetPath, targetDoc);
      await assertSucceeds(
        updateDoc(doc(adminCtx.firestore(), targetPath), {
          isAdmin: true,
        })
      );
    });

    it("allows an admin to revoke isAdmin (set to false) on another user", async () => {
      const adminCtx = await seedAdminAndGetContext(adminUid);
      await seedDoc(targetPath, { ...targetDoc, isAdmin: true });
      await assertSucceeds(
        updateDoc(doc(adminCtx.firestore(), targetPath), {
          isAdmin: false,
        })
      );
    });

    it("allows an admin to change another user's role field", async () => {
      const adminCtx = await seedAdminAndGetContext(adminUid);
      await seedDoc(targetPath, targetDoc);
      await assertSucceeds(
        updateDoc(doc(adminCtx.firestore(), targetPath), {
          role: "customer",
        })
      );
    });

    it("allows an admin to update their own isAdmin field", async () => {
      const adminCtx = await seedAdminAndGetContext(adminUid);
      await assertSucceeds(
        updateDoc(doc(adminCtx.firestore(), `users/${adminUid}`), {
          isAdmin: false,
        })
      );
    });

    it("denies a non-admin from granting isAdmin to another user", async () => {
      await seedDoc(targetPath, targetDoc);
      await assertFails(
        updateDoc(doc(authed(ownerUid).firestore(), targetPath), {
          isAdmin: true,
        })
      );
    });

    it("denies a non-admin from changing another user's role", async () => {
      await seedDoc(targetPath, targetDoc);
      await assertFails(
        updateDoc(doc(authed(ownerUid).firestore(), targetPath), {
          role: "customer",
        })
      );
    });
  });

  describe("private/appState subcollection", () => {
    const appStatePath = `users/${ownerUid}/private/appState`;
    const appStateData = { lastRoute: "route-1", theme: "dark" };

    it("allows owner to read their appState", async () => {
      await seedDoc(appStatePath, appStateData);
      await assertSucceeds(
        getDoc(doc(authed(ownerUid).firestore(), appStatePath))
      );
    });

    it("allows owner to write their appState", async () => {
      await assertSucceeds(
        setDoc(doc(authed(ownerUid).firestore(), appStatePath), appStateData)
      );
    });

    it("denies another user from reading someone else's appState", async () => {
      await seedDoc(appStatePath, appStateData);
      await assertFails(
        getDoc(doc(authed(otherUid).firestore(), appStatePath))
      );
    });

    it("denies another user from writing someone else's appState", async () => {
      await assertFails(
        setDoc(
          doc(authed(otherUid).firestore(), appStatePath),
          appStateData
        )
      );
    });

    it("denies unauthenticated access to appState", async () => {
      await seedDoc(appStatePath, appStateData);
      await assertFails(
        getDoc(doc(unauthed().firestore(), appStatePath))
      );
    });
  });
});

// ─── notifications ───────────────────────────────────────────────────────────

describe("notifications collection", () => {
  const ownerUid = "notif-owner";
  const otherUid = "notif-other";
  const notifPath = "notifications/notif-1";
  const notifData = { userId: ownerUid, message: "You have a new message" };

  it("denies unauthenticated read", async () => {
    await seedDoc(notifPath, notifData);
    await assertFails(getDoc(doc(unauthed().firestore(), notifPath)));
  });

  it("allows owner to read their notification", async () => {
    await seedDoc(notifPath, notifData);
    await assertSucceeds(getDoc(doc(authed(ownerUid).firestore(), notifPath)));
  });

  it("denies another user from reading someone else's notification", async () => {
    await seedDoc(notifPath, notifData);
    await assertFails(getDoc(doc(authed(otherUid).firestore(), notifPath)));
  });

  it("allows owner to create a notification targeting themselves", async () => {
    await assertSucceeds(
      setDoc(doc(authed(ownerUid).firestore(), notifPath), notifData)
    );
  });

  it("denies creating a notification targeting someone else", async () => {
    await assertFails(
      setDoc(doc(authed(otherUid).firestore(), notifPath), notifData)
    );
  });

  it("allows owner to delete their notification", async () => {
    await seedDoc(notifPath, notifData);
    await assertSucceeds(
      deleteDoc(doc(authed(ownerUid).firestore(), notifPath))
    );
  });

  it("denies another user from deleting someone else's notification", async () => {
    await seedDoc(notifPath, notifData);
    await assertFails(
      deleteDoc(doc(authed(otherUid).firestore(), notifPath))
    );
  });
});

// ─── jobRequests ──────────────────────────────────────────────────────────────

describe("jobRequests collection", () => {
  const customerUid = "customer-1";
  const proUid = "pro-1";
  const otherUid = "other-user";
  const jobPath = "jobRequests/job-1";
  const jobData = { customerId: customerUid, description: "Fix sink" };

  it("denies unauthenticated read", async () => {
    await seedDoc(jobPath, jobData);
    await assertFails(getDoc(doc(unauthed().firestore(), jobPath)));
  });

  it("allows any authenticated user to read a job request", async () => {
    await seedDoc(jobPath, jobData);
    await assertSucceeds(getDoc(doc(authed(otherUid).firestore(), jobPath)));
  });

  it("allows customer to create their job request", async () => {
    await assertSucceeds(
      setDoc(doc(authed(customerUid).firestore(), jobPath), jobData)
    );
  });

  it("denies creating a job request with someone else's customerId", async () => {
    await assertFails(
      setDoc(doc(authed(otherUid).firestore(), jobPath), jobData)
    );
  });

  it("allows customer to update their job request without changing customerId", async () => {
    await seedDoc(jobPath, jobData);
    await assertSucceeds(
      updateDoc(doc(authed(customerUid).firestore(), jobPath), {
        description: "Fix sink urgently",
        customerId: customerUid,
      })
    );
  });

  it("allows accepted pro to update the job request", async () => {
    await seedDoc(jobPath, { ...jobData, acceptedProId: proUid });
    await assertSucceeds(
      updateDoc(doc(authed(proUid).firestore(), jobPath), {
        status: "in-progress",
        customerId: customerUid,
      })
    );
  });

  it("denies customer from changing customerId on update", async () => {
    await seedDoc(jobPath, jobData);
    await assertFails(
      updateDoc(doc(authed(customerUid).firestore(), jobPath), {
        customerId: otherUid,
      })
    );
  });

  it("allows customer to delete their job request", async () => {
    await seedDoc(jobPath, jobData);
    await assertSucceeds(
      deleteDoc(doc(authed(customerUid).firestore(), jobPath))
    );
  });

  it("denies another user from deleting someone else's job request", async () => {
    await seedDoc(jobPath, jobData);
    await assertFails(
      deleteDoc(doc(authed(otherUid).firestore(), jobPath))
    );
  });
});

// ─── matchQuotes ──────────────────────────────────────────────────────────────

describe("matchQuotes collection", () => {
  const proUid = "pro-mq-1";
  const customerUid = "customer-mq-1";
  const otherUid = "other-mq";
  const quotePath = "matchQuotes/quote-1";
  const quoteData = {
    proId: proUid,
    customerId: customerUid,
    amount: 150,
  };

  it("denies unauthenticated read", async () => {
    await seedDoc(quotePath, quoteData);
    await assertFails(getDoc(doc(unauthed().firestore(), quotePath)));
  });

  it("allows the pro to read their quote", async () => {
    await seedDoc(quotePath, quoteData);
    await assertSucceeds(getDoc(doc(authed(proUid).firestore(), quotePath)));
  });

  it("allows the customer to read the quote addressed to them", async () => {
    await seedDoc(quotePath, quoteData);
    await assertSucceeds(
      getDoc(doc(authed(customerUid).firestore(), quotePath))
    );
  });

  it("denies an unrelated user from reading the quote", async () => {
    await seedDoc(quotePath, quoteData);
    await assertFails(getDoc(doc(authed(otherUid).firestore(), quotePath)));
  });

  it("allows the pro to create a quote (proId = caller)", async () => {
    await assertSucceeds(
      setDoc(doc(authed(proUid).firestore(), quotePath), quoteData)
    );
  });

  it("denies creating a quote with someone else as proId", async () => {
    await assertFails(
      setDoc(doc(authed(otherUid).firestore(), quotePath), quoteData)
    );
  });

  it("allows the pro to delete their quote", async () => {
    await seedDoc(quotePath, quoteData);
    await assertSucceeds(
      deleteDoc(doc(authed(proUid).firestore(), quotePath))
    );
  });

  it("denies the customer from deleting the quote", async () => {
    await seedDoc(quotePath, quoteData);
    await assertFails(
      deleteDoc(doc(authed(customerUid).firestore(), quotePath))
    );
  });
});

// ─── reviews ──────────────────────────────────────────────────────────────────

describe("reviews collection", () => {
  const customerUid = "customer-rev";
  const otherUid = "other-rev";
  const reviewPath = "reviews/review-1";
  const reviewData = {
    customerId: customerUid,
    proId: "pro-rev",
    rating: 5,
    comment: "Great work!",
  };

  it("denies unauthenticated read", async () => {
    await seedDoc(reviewPath, reviewData);
    await assertFails(getDoc(doc(unauthed().firestore(), reviewPath)));
  });

  it("allows any authenticated user to read reviews", async () => {
    await seedDoc(reviewPath, reviewData);
    await assertSucceeds(
      getDoc(doc(authed(otherUid).firestore(), reviewPath))
    );
  });

  it("allows customer to create a review as themselves", async () => {
    await assertSucceeds(
      setDoc(doc(authed(customerUid).firestore(), reviewPath), reviewData)
    );
  });

  it("denies creating a review with someone else's customerId", async () => {
    await assertFails(
      setDoc(doc(authed(otherUid).firestore(), reviewPath), reviewData)
    );
  });

  it("denies updating an existing review (immutable after creation)", async () => {
    await seedDoc(reviewPath, reviewData);
    await assertFails(
      updateDoc(doc(authed(customerUid).firestore(), reviewPath), {
        rating: 1,
        customerId: customerUid,
      })
    );
  });

  it("denies deleting a review (immutable after creation)", async () => {
    await seedDoc(reviewPath, reviewData);
    await assertFails(
      deleteDoc(doc(authed(customerUid).firestore(), reviewPath))
    );
  });
});

// ─── declinedLeads ────────────────────────────────────────────────────────────

describe("declinedLeads collection", () => {
  const proUid = "pro-dl";
  const otherUid = "other-dl";
  const leadPath = "declinedLeads/lead-1";
  const leadData = { proId: proUid, jobRequestId: "job-1" };

  it("denies unauthenticated read", async () => {
    await seedDoc(leadPath, leadData);
    await assertFails(getDoc(doc(unauthed().firestore(), leadPath)));
  });

  it("allows the pro to read their declined lead", async () => {
    await seedDoc(leadPath, leadData);
    await assertSucceeds(getDoc(doc(authed(proUid).firestore(), leadPath)));
  });

  it("denies another user from reading someone else's declined lead", async () => {
    await seedDoc(leadPath, leadData);
    await assertFails(getDoc(doc(authed(otherUid).firestore(), leadPath)));
  });

  it("allows the pro to create a declined lead as themselves", async () => {
    await assertSucceeds(
      setDoc(doc(authed(proUid).firestore(), leadPath), leadData)
    );
  });

  it("denies creating a declined lead with someone else as proId", async () => {
    await assertFails(
      setDoc(doc(authed(otherUid).firestore(), leadPath), leadData)
    );
  });

  it("allows the pro to delete their declined lead", async () => {
    await seedDoc(leadPath, leadData);
    await assertSucceeds(
      deleteDoc(doc(authed(proUid).firestore(), leadPath))
    );
  });

  it("denies another user from deleting someone else's declined lead", async () => {
    await seedDoc(leadPath, leadData);
    await assertFails(
      deleteDoc(doc(authed(otherUid).firestore(), leadPath))
    );
  });
});

// ─── conversations & messages ─────────────────────────────────────────────────

describe("conversations collection", () => {
  const user1 = "conv-user1";
  const user2 = "conv-user2";
  const outsider = "conv-outsider";
  const convPath = "conversations/conv-1";
  const convData = {
    participants: [user1, user2],
    jobRequestId: "job-1",
    lastMessage: "Hello",
  };

  it("denies unauthenticated read", async () => {
    await seedDoc(convPath, convData);
    await assertFails(getDoc(doc(unauthed().firestore(), convPath)));
  });

  it("allows a participant to read the conversation", async () => {
    await seedDoc(convPath, convData);
    await assertSucceeds(getDoc(doc(authed(user1).firestore(), convPath)));
  });

  it("denies a non-participant from reading the conversation", async () => {
    await seedDoc(convPath, convData);
    await assertFails(getDoc(doc(authed(outsider).firestore(), convPath)));
  });

  it("allows any authenticated user to create a conversation that includes themselves", async () => {
    await assertSucceeds(
      setDoc(doc(authed(user1).firestore(), convPath), convData)
    );
  });

  it("denies creating a conversation that does not include the caller", async () => {
    await assertFails(
      setDoc(doc(authed(outsider).firestore(), convPath), convData)
    );
  });

  it("allows a participant to update metadata (lastMessage, lastMessageAt)", async () => {
    await seedDoc(convPath, convData);
    await assertSucceeds(
      updateDoc(doc(authed(user1).firestore(), convPath), {
        participants: [user1, user2],
        jobRequestId: "job-1",
        lastMessage: "Updated message",
      })
    );
  });

  it("denies updating the participants list", async () => {
    await seedDoc(convPath, convData);
    await assertFails(
      updateDoc(doc(authed(user1).firestore(), convPath), {
        participants: [user1, user2, outsider],
        jobRequestId: "job-1",
        lastMessage: "Updated",
      })
    );
  });

  it("denies updating the jobRequestId", async () => {
    await seedDoc(convPath, convData);
    await assertFails(
      updateDoc(doc(authed(user1).firestore(), convPath), {
        participants: [user1, user2],
        jobRequestId: "different-job",
        lastMessage: "Updated",
      })
    );
  });

  describe("messages subcollection", () => {
    const msgPath = "conversations/conv-1/messages/msg-1";
    const msgData = { senderId: user1, text: "Hello!", createdAt: Date.now() };

    it("allows a participant to read messages", async () => {
      await seedDoc(convPath, convData);
      await seedDoc(msgPath, msgData);
      await assertSucceeds(getDoc(doc(authed(user1).firestore(), msgPath)));
    });

    it("denies a non-participant from reading messages", async () => {
      await seedDoc(convPath, convData);
      await seedDoc(msgPath, msgData);
      await assertFails(getDoc(doc(authed(outsider).firestore(), msgPath)));
    });

    it("allows a participant to create a message as themselves (senderId = caller)", async () => {
      await seedDoc(convPath, convData);
      await assertSucceeds(
        setDoc(doc(authed(user1).firestore(), msgPath), msgData)
      );
    });

    it("denies a participant from creating a message with a different senderId", async () => {
      await seedDoc(convPath, convData);
      await assertFails(
        setDoc(doc(authed(user1).firestore(), msgPath), {
          ...msgData,
          senderId: user2,
        })
      );
    });

    it("denies a non-participant from creating a message", async () => {
      await seedDoc(convPath, convData);
      await assertFails(
        setDoc(doc(authed(outsider).firestore(), msgPath), {
          ...msgData,
          senderId: outsider,
        })
      );
    });
  });
});

// ─── estimates ────────────────────────────────────────────────────────────────

describe("estimates collection", () => {
  const proUid = "pro-est";
  const customerUid = "customer-est";
  const otherUid = "other-est";
  const estimatePath = "estimates/est-1";
  const estimateData = { proId: proUid, customerId: customerUid, amount: 300 };

  it("denies unauthenticated read", async () => {
    await seedDoc(estimatePath, estimateData);
    await assertFails(getDoc(doc(unauthed().firestore(), estimatePath)));
  });

  it("allows the pro to read the estimate", async () => {
    await seedDoc(estimatePath, estimateData);
    await assertSucceeds(
      getDoc(doc(authed(proUid).firestore(), estimatePath))
    );
  });

  it("allows the customer to read the estimate", async () => {
    await seedDoc(estimatePath, estimateData);
    await assertSucceeds(
      getDoc(doc(authed(customerUid).firestore(), estimatePath))
    );
  });

  it("denies an unrelated user from reading the estimate", async () => {
    await seedDoc(estimatePath, estimateData);
    await assertFails(
      getDoc(doc(authed(otherUid).firestore(), estimatePath))
    );
  });

  it("allows the pro to create an estimate", async () => {
    await assertSucceeds(
      setDoc(doc(authed(proUid).firestore(), estimatePath), estimateData)
    );
  });

  it("denies creating an estimate with someone else as proId", async () => {
    await assertFails(
      setDoc(doc(authed(otherUid).firestore(), estimatePath), estimateData)
    );
  });

  it("allows the pro to update their estimate without changing proId", async () => {
    await seedDoc(estimatePath, estimateData);
    await assertSucceeds(
      updateDoc(doc(authed(proUid).firestore(), estimatePath), {
        amount: 400,
        proId: proUid,
      })
    );
  });

  it("denies the customer from updating the estimate", async () => {
    await seedDoc(estimatePath, estimateData);
    await assertFails(
      updateDoc(doc(authed(customerUid).firestore(), estimatePath), {
        amount: 100,
        proId: proUid,
      })
    );
  });

  it("allows the pro to delete the estimate", async () => {
    await seedDoc(estimatePath, estimateData);
    await assertSucceeds(
      deleteDoc(doc(authed(proUid).firestore(), estimatePath))
    );
  });

  it("denies the customer from deleting the estimate", async () => {
    await seedDoc(estimatePath, estimateData);
    await assertFails(
      deleteDoc(doc(authed(customerUid).firestore(), estimatePath))
    );
  });
});

// ─── calendarEvents ───────────────────────────────────────────────────────────

describe("calendarEvents collection", () => {
  const ownerUid = "cal-owner";
  const otherUid = "cal-other";
  const eventPath = "calendarEvents/event-1";
  const eventData = { userId: ownerUid, title: "Meeting", date: "2026-01-01" };

  it("denies unauthenticated read", async () => {
    await seedDoc(eventPath, eventData);
    await assertFails(getDoc(doc(unauthed().firestore(), eventPath)));
  });

  it("allows owner to read their calendar event", async () => {
    await seedDoc(eventPath, eventData);
    await assertSucceeds(getDoc(doc(authed(ownerUid).firestore(), eventPath)));
  });

  it("denies another user from reading someone else's calendar event", async () => {
    await seedDoc(eventPath, eventData);
    await assertFails(getDoc(doc(authed(otherUid).firestore(), eventPath)));
  });

  it("allows owner to create a calendar event as themselves", async () => {
    await assertSucceeds(
      setDoc(doc(authed(ownerUid).firestore(), eventPath), eventData)
    );
  });

  it("denies another user from creating a calendar event with someone else's userId", async () => {
    await assertFails(
      setDoc(doc(authed(otherUid).firestore(), eventPath), eventData)
    );
  });

  it("allows owner to update their calendar event without changing userId", async () => {
    await seedDoc(eventPath, eventData);
    await assertSucceeds(
      updateDoc(doc(authed(ownerUid).firestore(), eventPath), {
        title: "Rescheduled Meeting",
        userId: ownerUid,
      })
    );
  });

  it("denies owner from changing userId on update (ownership transfer)", async () => {
    await seedDoc(eventPath, eventData);
    await assertFails(
      updateDoc(doc(authed(ownerUid).firestore(), eventPath), {
        userId: otherUid,
      })
    );
  });

  it("denies another user from updating someone else's calendar event", async () => {
    await seedDoc(eventPath, eventData);
    await assertFails(
      updateDoc(doc(authed(otherUid).firestore(), eventPath), {
        title: "Hacked",
        userId: otherUid,
      })
    );
  });

  it("denies unauthenticated update", async () => {
    await seedDoc(eventPath, eventData);
    await assertFails(
      updateDoc(doc(unauthed().firestore(), eventPath), { title: "Unauthorized" })
    );
  });

  it("allows owner to delete their calendar event", async () => {
    await seedDoc(eventPath, eventData);
    await assertSucceeds(
      deleteDoc(doc(authed(ownerUid).firestore(), eventPath))
    );
  });

  it("denies another user from deleting someone else's calendar event", async () => {
    await seedDoc(eventPath, eventData);
    await assertFails(
      deleteDoc(doc(authed(otherUid).firestore(), eventPath))
    );
  });

  it("denies unauthenticated delete", async () => {
    await seedDoc(eventPath, eventData);
    await assertFails(deleteDoc(doc(unauthed().firestore(), eventPath)));
  });
});

// ─── jobTemplates ─────────────────────────────────────────────────────────────

describe("jobTemplates collection", () => {
  const ownerUid = "tmpl-owner";
  const otherUid = "tmpl-other";
  const tmplPath = "jobTemplates/tmpl-1";
  const tmplData = { userId: ownerUid, name: "Standard Cleaning" };

  it("denies unauthenticated read", async () => {
    await seedDoc(tmplPath, tmplData);
    await assertFails(getDoc(doc(unauthed().firestore(), tmplPath)));
  });

  it("allows owner to read their template", async () => {
    await seedDoc(tmplPath, tmplData);
    await assertSucceeds(getDoc(doc(authed(ownerUid).firestore(), tmplPath)));
  });

  it("denies another user from reading someone else's template", async () => {
    await seedDoc(tmplPath, tmplData);
    await assertFails(getDoc(doc(authed(otherUid).firestore(), tmplPath)));
  });

  it("allows owner to create their own template", async () => {
    await assertSucceeds(
      setDoc(doc(authed(ownerUid).firestore(), tmplPath), tmplData)
    );
  });

  it("denies another user from creating a template with someone else's userId", async () => {
    await assertFails(
      setDoc(doc(authed(otherUid).firestore(), tmplPath), tmplData)
    );
  });

  it("allows owner to update their template without changing userId", async () => {
    await seedDoc(tmplPath, tmplData);
    await assertSucceeds(
      updateDoc(doc(authed(ownerUid).firestore(), tmplPath), {
        name: "Premium Cleaning",
        userId: ownerUid,
      })
    );
  });

  it("denies owner from changing userId on update (ownership transfer)", async () => {
    await seedDoc(tmplPath, tmplData);
    await assertFails(
      updateDoc(doc(authed(ownerUid).firestore(), tmplPath), {
        userId: otherUid,
      })
    );
  });

  it("denies another user from updating someone else's template", async () => {
    await seedDoc(tmplPath, tmplData);
    await assertFails(
      updateDoc(doc(authed(otherUid).firestore(), tmplPath), {
        name: "Hacked Template",
        userId: otherUid,
      })
    );
  });

  it("denies unauthenticated update", async () => {
    await seedDoc(tmplPath, tmplData);
    await assertFails(
      updateDoc(doc(unauthed().firestore(), tmplPath), { name: "Unauthorized" })
    );
  });

  it("allows owner to delete their template", async () => {
    await seedDoc(tmplPath, tmplData);
    await assertSucceeds(
      deleteDoc(doc(authed(ownerUid).firestore(), tmplPath))
    );
  });

  it("denies another user from deleting someone else's template", async () => {
    await seedDoc(tmplPath, tmplData);
    await assertFails(
      deleteDoc(doc(authed(otherUid).firestore(), tmplPath))
    );
  });

  it("denies unauthenticated delete", async () => {
    await seedDoc(tmplPath, tmplData);
    await assertFails(deleteDoc(doc(unauthed().firestore(), tmplPath)));
  });
});

// ─── savedAddresses ───────────────────────────────────────────────────────────

describe("savedAddresses collection", () => {
  const ownerUid = "addr-owner";
  const otherUid = "addr-other";
  const addrPath = "savedAddresses/addr-1";
  const addrData = { userId: ownerUid, label: "Home", address: "123 Main St" };

  it("denies unauthenticated read", async () => {
    await seedDoc(addrPath, addrData);
    await assertFails(getDoc(doc(unauthed().firestore(), addrPath)));
  });

  it("allows owner to read their saved address", async () => {
    await seedDoc(addrPath, addrData);
    await assertSucceeds(getDoc(doc(authed(ownerUid).firestore(), addrPath)));
  });

  it("denies another user from reading someone else's saved address", async () => {
    await seedDoc(addrPath, addrData);
    await assertFails(getDoc(doc(authed(otherUid).firestore(), addrPath)));
  });

  it("allows owner to create their saved address", async () => {
    await assertSucceeds(
      setDoc(doc(authed(ownerUid).firestore(), addrPath), addrData)
    );
  });

  it("denies another user from creating a saved address with someone else's userId", async () => {
    await assertFails(
      setDoc(doc(authed(otherUid).firestore(), addrPath), addrData)
    );
  });

  it("allows owner to update their saved address without changing userId", async () => {
    await seedDoc(addrPath, addrData);
    await assertSucceeds(
      updateDoc(doc(authed(ownerUid).firestore(), addrPath), {
        label: "Work",
        userId: ownerUid,
      })
    );
  });

  it("denies owner from changing userId on update (ownership transfer)", async () => {
    await seedDoc(addrPath, addrData);
    await assertFails(
      updateDoc(doc(authed(ownerUid).firestore(), addrPath), {
        userId: otherUid,
      })
    );
  });

  it("denies another user from updating someone else's saved address", async () => {
    await seedDoc(addrPath, addrData);
    await assertFails(
      updateDoc(doc(authed(otherUid).firestore(), addrPath), {
        label: "Hacked",
        userId: otherUid,
      })
    );
  });

  it("denies unauthenticated update", async () => {
    await seedDoc(addrPath, addrData);
    await assertFails(
      updateDoc(doc(unauthed().firestore(), addrPath), { label: "Unauthorized" })
    );
  });

  it("allows owner to delete their saved address", async () => {
    await seedDoc(addrPath, addrData);
    await assertSucceeds(
      deleteDoc(doc(authed(ownerUid).firestore(), addrPath))
    );
  });

  it("denies another user from deleting someone else's saved address", async () => {
    await seedDoc(addrPath, addrData);
    await assertFails(
      deleteDoc(doc(authed(otherUid).firestore(), addrPath))
    );
  });

  it("denies unauthenticated delete", async () => {
    await seedDoc(addrPath, addrData);
    await assertFails(deleteDoc(doc(unauthed().firestore(), addrPath)));
  });
});

// ─── savedPros ────────────────────────────────────────────────────────────────

describe("savedPros collection", () => {
  const customerUid = "customer-sp";
  const proUid = "pro-sp";
  const otherUid = "other-sp";
  const savedProPath = "savedPros/saved-1";
  const savedProData = { customerId: customerUid, proId: proUid };

  it("denies unauthenticated read", async () => {
    await seedDoc(savedProPath, savedProData);
    await assertFails(getDoc(doc(unauthed().firestore(), savedProPath)));
  });

  it("allows the customer to read the saved pro record", async () => {
    await seedDoc(savedProPath, savedProData);
    await assertSucceeds(
      getDoc(doc(authed(customerUid).firestore(), savedProPath))
    );
  });

  it("allows the pro to read that they were saved", async () => {
    await seedDoc(savedProPath, savedProData);
    await assertSucceeds(
      getDoc(doc(authed(proUid).firestore(), savedProPath))
    );
  });

  it("denies an unrelated user from reading the saved pro record", async () => {
    await seedDoc(savedProPath, savedProData);
    await assertFails(
      getDoc(doc(authed(otherUid).firestore(), savedProPath))
    );
  });

  it("allows the customer to create a saved pro record", async () => {
    await assertSucceeds(
      setDoc(doc(authed(customerUid).firestore(), savedProPath), savedProData)
    );
  });

  it("denies creating a saved pro record with someone else's customerId", async () => {
    await assertFails(
      setDoc(doc(authed(otherUid).firestore(), savedProPath), savedProData)
    );
  });

  it("allows the customer to delete the saved pro record", async () => {
    await seedDoc(savedProPath, savedProData);
    await assertSucceeds(
      deleteDoc(doc(authed(customerUid).firestore(), savedProPath))
    );
  });

  it("denies the pro from deleting the saved pro record", async () => {
    await seedDoc(savedProPath, savedProData);
    await assertFails(
      deleteDoc(doc(authed(proUid).firestore(), savedProPath))
    );
  });
});

// ─── reports ──────────────────────────────────────────────────────────────────

describe("reports collection", () => {
  const reporterUid = "reporter-1";
  const otherUid = "other-reporter";
  const reportPath = "reports/report-1";
  // Used for seeding (bypasses rules) — may contain any fields.
  const reportData = { reporterId: reporterUid, subject: "Spam", status: "open" };
  // Valid reporter-writable payload that satisfies the create allowlist.
  const validCreateData = {
    reporterId: reporterUid,
    issueType: "Scam",
    description: "This user scammed me.",
    status: "open",
    createdAt: new Date().toISOString(),
  };

  it("denies unauthenticated read", async () => {
    await seedDoc(reportPath, reportData);
    await assertFails(getDoc(doc(unauthed().firestore(), reportPath)));
  });

  it("allows the reporter to read their own report", async () => {
    await seedDoc(reportPath, reportData);
    await assertSucceeds(
      getDoc(doc(authed(reporterUid).firestore(), reportPath))
    );
  });

  it("denies another non-admin user from reading someone else's report", async () => {
    await seedDoc(reportPath, reportData);
    await assertFails(
      getDoc(doc(authed(otherUid).firestore(), reportPath))
    );
  });

  it("allows a reporter to create a report with allowlisted fields", async () => {
    await assertSucceeds(
      setDoc(doc(authed(reporterUid).firestore(), reportPath), validCreateData)
    );
  });

  it("denies creating a report with someone else's reporterId", async () => {
    await assertFails(
      setDoc(doc(authed(otherUid).firestore(), reportPath), validCreateData)
    );
  });

  it("denies a reporter from injecting adminNotes during create", async () => {
    await assertFails(
      setDoc(doc(authed(reporterUid).firestore(), reportPath), {
        ...validCreateData,
        adminNotes: "Looks fine to me.",
      })
    );
  });

  it("denies a reporter from creating a report with status other than 'open'", async () => {
    await assertFails(
      setDoc(doc(authed(reporterUid).firestore(), reportPath), {
        ...validCreateData,
        status: "resolved",
      })
    );
  });

  it("denies a non-admin user from updating a report", async () => {
    await seedDoc(reportPath, reportData);
    await assertFails(
      updateDoc(doc(authed(reporterUid).firestore(), reportPath), {
        status: "resolved",
      })
    );
  });

  describe("admin-only access", () => {
    const adminUid = "admin-reports";

    it("allows an admin to read any report (not just their own)", async () => {
      const adminCtx = await seedAdminAndGetContext(adminUid);
      await seedDoc(reportPath, reportData);
      await assertSucceeds(getDoc(doc(adminCtx.firestore(), reportPath)));
    });

    it("allows an admin to update a report status to resolved", async () => {
      const adminCtx = await seedAdminAndGetContext(adminUid);
      await seedDoc(reportPath, reportData);
      await assertSucceeds(
        updateDoc(doc(adminCtx.firestore(), reportPath), {
          status: "resolved",
        })
      );
    });

    it("allows an admin to update a report with additional resolution fields", async () => {
      const adminCtx = await seedAdminAndGetContext(adminUid);
      await seedDoc(reportPath, reportData);
      await assertSucceeds(
        updateDoc(doc(adminCtx.firestore(), reportPath), {
          status: "resolved",
          resolvedAt: Date.now(),
          resolvedBy: adminUid,
        })
      );
    });

    it("denies a non-admin authenticated user from updating another user's report", async () => {
      await seedDoc(reportPath, reportData);
      await assertFails(
        updateDoc(doc(authed(otherUid).firestore(), reportPath), {
          status: "resolved",
        })
      );
    });

    it("allows an admin to delete a report", async () => {
      const adminCtx = await seedAdminAndGetContext(adminUid);
      await seedDoc(reportPath, reportData);
      await assertSucceeds(
        deleteDoc(doc(adminCtx.firestore(), reportPath))
      );
    });

    it("denies the original reporter from deleting their own report", async () => {
      await seedDoc(reportPath, reportData);
      await assertFails(
        deleteDoc(doc(authed(reporterUid).firestore(), reportPath))
      );
    });

    it("denies a non-admin user from deleting someone else's report", async () => {
      await seedDoc(reportPath, reportData);
      await assertFails(
        deleteDoc(doc(authed(otherUid).firestore(), reportPath))
      );
    });

    it("denies an unauthenticated user from deleting a report", async () => {
      await seedDoc(reportPath, reportData);
      await assertFails(
        deleteDoc(doc(unauthed().firestore(), reportPath))
      );
    });
  });
});

// ─── publicProfiles ───────────────────────────────────────────────────────────

describe("publicProfiles collection", () => {
  const proUid = "pro-pub";
  const customerUid = "customer-pub";
  const otherUid = "other-pub";
  const profilePath = `publicProfiles/${proUid}`;
  const profileData = {
    displayName: "Alice Smith",
    businessName: "Alice's Plumbing",
    services: ["Plumbing"],
    serviceArea: "Athens, GA",
    serviceRadiusMiles: 25,
    about: "10 years experience",
    role: "pro",
    updatedAt: new Date().toISOString(),
  };

  it("denies unauthenticated read", async () => {
    await seedDoc(profilePath, profileData);
    await assertFails(getDoc(doc(unauthed().firestore(), profilePath)));
  });

  it("allows any authenticated user to read a pro public profile", async () => {
    await seedDoc(profilePath, profileData);
    await assertSucceeds(
      getDoc(doc(authed(customerUid).firestore(), profilePath))
    );
  });

  it("allows the pro to read their own public profile", async () => {
    await seedDoc(profilePath, profileData);
    await assertSucceeds(
      getDoc(doc(authed(proUid).firestore(), profilePath))
    );
  });

  it("allows the pro to create their own public profile", async () => {
    await assertSucceeds(
      setDoc(doc(authed(proUid).firestore(), profilePath), profileData)
    );
  });

  it("denies another user from creating a public profile for someone else", async () => {
    await assertFails(
      setDoc(doc(authed(otherUid).firestore(), profilePath), profileData)
    );
  });

  it("allows the pro to update their own public profile", async () => {
    await seedDoc(profilePath, profileData);
    await assertSucceeds(
      updateDoc(doc(authed(proUid).firestore(), profilePath), {
        about: "Updated bio",
      })
    );
  });

  it("denies another user from updating someone else's public profile", async () => {
    await seedDoc(profilePath, profileData);
    await assertFails(
      updateDoc(doc(authed(otherUid).firestore(), profilePath), {
        about: "Hacked bio",
      })
    );
  });

  it("denies a non-admin from deleting a public profile", async () => {
    await seedDoc(profilePath, profileData);
    await assertFails(
      deleteDoc(doc(authed(otherUid).firestore(), profilePath))
    );
  });

  it("denies the pro themselves from deleting their own public profile", async () => {
    await seedDoc(profilePath, profileData);
    await assertFails(
      deleteDoc(doc(authed(proUid).firestore(), profilePath))
    );
  });

  it("allows an admin to delete a public profile", async () => {
    const adminUid = "admin-pub";
    const adminCtx = await seedAdminAndGetContext(adminUid);
    await seedDoc(profilePath, profileData);
    await assertSucceeds(
      deleteDoc(doc(adminCtx.firestore(), profilePath))
    );
  });

  it("denies the pro from writing email into their public profile", async () => {
    await assertFails(
      setDoc(doc(authed(proUid).firestore(), profilePath), {
        ...profileData,
        email: "alice@example.com",
      })
    );
  });

  it("denies the pro from writing isAdmin into their public profile", async () => {
    await assertFails(
      setDoc(doc(authed(proUid).firestore(), profilePath), {
        ...profileData,
        isAdmin: true,
      })
    );
  });

  it("denies the pro from writing an arbitrary unknown field into their public profile", async () => {
    await assertFails(
      setDoc(doc(authed(proUid).firestore(), profilePath), {
        ...profileData,
        secretToken: "abc123",
      })
    );
  });

  it("denies updating a public profile with a disallowed field (email)", async () => {
    await seedDoc(profilePath, profileData);
    await assertFails(
      updateDoc(doc(authed(proUid).firestore(), profilePath), {
        email: "alice@example.com",
        about: "Updated bio",
      })
    );
  });

  it("allows an admin to set trust badges on an existing public profile", async () => {
    const adminUid = "admin-badges";
    const adminCtx = await seedAdminAndGetContext(adminUid);
    await seedDoc(profilePath, profileData);
    await assertSucceeds(
      updateDoc(doc(adminCtx.firestore(), profilePath), {
        verifiedPro: true,
      })
    );
  });

  it("allows an admin to create a public profile document (e.g. when toggling first badge)", async () => {
    const adminUid = "admin-create-pub";
    const adminCtx = await seedAdminAndGetContext(adminUid);
    await assertSucceeds(
      setDoc(doc(adminCtx.firestore(), profilePath), {
        ...profileData,
        verifiedPro: true,
      })
    );
  });

  it("allows owner to update profile fields after admin has set trust badges", async () => {
    await seedDoc(profilePath, { ...profileData, verifiedPro: true });
    await assertSucceeds(
      updateDoc(doc(authed(proUid).firestore(), profilePath), {
        about: "Updated bio after badge was set",
        verifiedPro: true,
      })
    );
  });

  it("denies owner from self-awarding a trust badge that does not exist yet", async () => {
    await seedDoc(profilePath, profileData);
    await assertFails(
      updateDoc(doc(authed(proUid).firestore(), profilePath), {
        verifiedPro: true,
      })
    );
  });

  it("denies owner from changing an existing trust badge value", async () => {
    await seedDoc(profilePath, { ...profileData, verifiedPro: false });
    await assertFails(
      updateDoc(doc(authed(proUid).firestore(), profilePath), {
        verifiedPro: true,
      })
    );
  });

  it("denies owner from self-awarding completedJobsCount", async () => {
    await seedDoc(profilePath, profileData);
    await assertFails(
      updateDoc(doc(authed(proUid).firestore(), profilePath), {
        completedJobsCount: 100,
      })
    );
  });

  it("denies owner from writing verifiedPro on initial create", async () => {
    await assertFails(
      setDoc(doc(authed(proUid).firestore(), profilePath), {
        ...profileData,
        verifiedPro: true,
      })
    );
  });
});

// ─── customerProfiles ─────────────────────────────────────────────────────────

describe("customerProfiles collection", () => {
  const ownerUid = "customer-owner";
  const otherUid = "customer-other";
  const profilePath = `customerProfiles/${ownerUid}`;
  const profileData = {
    uid: ownerUid,
    displayName: "Alice Customer",
    phone: "555-1234",
    updatedAt: new Date().toISOString(),
  };

  it("denies unauthenticated read", async () => {
    await seedDoc(profilePath, profileData);
    await assertFails(getDoc(doc(unauthed().firestore(), profilePath)));
  });

  it("denies unauthenticated write", async () => {
    await assertFails(setDoc(doc(unauthed().firestore(), profilePath), profileData));
  });

  it("allows owner to read their own profile", async () => {
    await seedDoc(profilePath, profileData);
    await assertSucceeds(getDoc(doc(authed(ownerUid).firestore(), profilePath)));
  });

  it("denies another user from reading the profile", async () => {
    await seedDoc(profilePath, profileData);
    await assertFails(getDoc(doc(authed(otherUid).firestore(), profilePath)));
  });

  it("allows owner to create their own profile", async () => {
    await assertSucceeds(
      setDoc(doc(authed(ownerUid).firestore(), profilePath), profileData)
    );
  });

  it("denies another user from creating the profile", async () => {
    await assertFails(
      setDoc(doc(authed(otherUid).firestore(), profilePath), profileData)
    );
  });

  it("allows owner to update their own profile", async () => {
    await seedDoc(profilePath, profileData);
    await assertSucceeds(
      updateDoc(doc(authed(ownerUid).firestore(), profilePath), {
        displayName: "Alice Updated",
        updatedAt: new Date().toISOString(),
      })
    );
  });

  it("denies another user from updating the profile", async () => {
    await seedDoc(profilePath, profileData);
    await assertFails(
      updateDoc(doc(authed(otherUid).firestore(), profilePath), {
        displayName: "Hacked",
      })
    );
  });

  it("denies owner from deleting their profile", async () => {
    await seedDoc(profilePath, profileData);
    await assertFails(deleteDoc(doc(authed(ownerUid).firestore(), profilePath)));
  });

  it("allows admin to delete the profile", async () => {
    await seedDoc(profilePath, profileData);
    const adminCtx = await seedAdminAndGetContext("admin-uid");
    await assertSucceeds(deleteDoc(doc(adminCtx.firestore(), profilePath)));
  });
});

// ─── catch-all ────────────────────────────────────────────────────────────────

describe("catch-all rule", () => {
  it("denies read on an unlisted collection", async () => {
    await assertFails(
      getDoc(doc(authed("some-user").firestore(), "unknownCollection/doc-1"))
    );
  });

  it("denies write on an unlisted collection", async () => {
    await assertFails(
      setDoc(doc(authed("some-user").firestore(), "unknownCollection/doc-1"), {
        data: "value",
      })
    );
  });
});
