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
  collection,
  addDoc,
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

function adminContext(uid: string) {
  return testEnv.authenticatedContext(uid, { uid });
}

async function seedDoc(path: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data);
  });
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

  it("allows authenticated user to read any user document", async () => {
    await seedDoc(userPath, userDoc);
    await assertSucceeds(getDoc(doc(authed(otherUid).firestore(), userPath)));
  });

  it("denies unauthenticated user from reading a user document", async () => {
    await seedDoc(userPath, userDoc);
    await assertFails(getDoc(doc(unauthed().firestore(), userPath)));
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

  it("allows owner to update their profile without changing isAdmin or role", async () => {
    await seedDoc(userPath, userDoc);
    await assertSucceeds(
      updateDoc(doc(authed(ownerUid).firestore(), userPath), {
        displayName: "Alice Updated",
        isAdmin: false,
        role: "pro",
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

  it("denies owner from changing their role field", async () => {
    await seedDoc(userPath, userDoc);
    await assertFails(
      updateDoc(doc(authed(ownerUid).firestore(), userPath), {
        displayName: "Alice Updated",
        isAdmin: false,
        role: "admin",
      })
    );
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
  const reportData = { reporterId: reporterUid, subject: "Spam", status: "open" };

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

  it("allows a reporter to create a report as themselves", async () => {
    await assertSucceeds(
      setDoc(doc(authed(reporterUid).firestore(), reportPath), reportData)
    );
  });

  it("denies creating a report with someone else's reporterId", async () => {
    await assertFails(
      setDoc(doc(authed(otherUid).firestore(), reportPath), reportData)
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
