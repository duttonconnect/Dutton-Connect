import { Link } from "wouter";

export default function TermsOfService() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 text-sm text-gray-700 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Terms of Service</h1>
        <p className="text-gray-500 text-xs">Dutton Connect &mdash; Effective May 6, 2026</p>
      </div>

      <p>
        Welcome to Dutton Connect. By creating an account or using this app, you agree to these
        Terms of Service. Please read them carefully. If you do not agree, do not use the app.
      </p>

      <section>
        <h2 className="font-semibold text-gray-900 text-base mb-2">1. Platform Purpose</h2>
        <p>
          Dutton Connect is a local services marketplace that connects customers seeking home and
          business services with independent service professionals ("Pros"). We provide the platform
          and tools to facilitate these connections. Dutton Connect is not a party to any agreement
          made between customers and Pros, and we do not employ, endorse, or guarantee the work
          of any service provider listed on the platform.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 text-base mb-2">2. User Accounts</h2>
        <p>
          You must provide accurate and complete information when creating your account. You are
          responsible for maintaining the security of your account credentials. You may not share
          your account with others or create accounts on behalf of someone else without their
          authorization. If you believe your account has been compromised, contact us immediately.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 text-base mb-2">3. User Responsibilities</h2>
        <p className="mb-2">
          You are solely responsible for all content you post, messages you send, reviews you
          submit, and any agreements you enter into through the platform. By using Dutton Connect,
          you agree to:
        </p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Provide accurate information in your profile, job postings, and quotes</li>
          <li>Communicate honestly and respectfully with other users</li>
          <li>Honor commitments you make to other users through the platform</li>
          <li>Only post content you have the right to share</li>
          <li>Not post false, misleading, or defamatory reviews or information</li>
        </ul>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 text-base mb-2">4. Prohibited Conduct</h2>
        <p className="mb-2">You may not use Dutton Connect to:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Engage in any illegal activity or facilitate illegal services</li>
          <li>Harass, threaten, or harm other users</li>
          <li>Post spam, fake reviews, or deceptive content</li>
          <li>Impersonate another person or misrepresent your identity or qualifications</li>
          <li>Solicit personal information from other users outside the platform</li>
          <li>Attempt to bypass or damage the platform's systems or security</li>
          <li>Use the platform for any purpose other than connecting for legitimate services</li>
        </ul>
        <p className="mt-3">
          Violations may result in immediate account suspension or permanent removal from the
          platform, at our sole discretion.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 text-base mb-2">5. Agreements Between Users</h2>
        <p>
          Any agreement for services &mdash; including pricing, scope of work, scheduling, and
          payment &mdash; is made directly between the customer and the Pro. Dutton Connect is not
          a party to these agreements and is not responsible for their fulfillment, disputes,
          damages, or outcomes. Users are encouraged to communicate clearly and confirm all details
          before work begins.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 text-base mb-2">6. Payments</h2>
        <p>
          Dutton Connect does not process payments between users. Any payment arrangements are
          handled directly between customers and Pros. We are not responsible for payment disputes,
          chargebacks, or unpaid invoices. Users should exercise their own judgment when agreeing
          to payment terms.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 text-base mb-2">7. Reviews and Content</h2>
        <p>
          Reviews and other content you submit may be visible to other users on the platform. By
          submitting content, you grant Dutton Connect a non-exclusive, royalty-free license to
          display that content within the app. Reviews must be honest and based on your genuine
          experience. We reserve the right to remove content that violates these Terms or is
          reported as abusive.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 text-base mb-2">8. Account Suspension and Removal</h2>
        <p>
          We reserve the right to suspend or permanently remove any account that violates these
          Terms, engages in fraudulent activity, receives credible abuse reports, or otherwise
          harms the safety or integrity of the platform. Where possible, we will notify you of
          the reason for any action taken against your account.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 text-base mb-2">9. Services Provided As-Is</h2>
        <p>
          Dutton Connect is currently in an active development phase. The platform is provided
          "as-is" without warranties of any kind, express or implied. We do not guarantee
          uninterrupted service, the accuracy of listings, or the quality of services provided by
          any Pro. Features may change, be added, or be removed as the platform evolves.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 text-base mb-2">10. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, Dutton Connect shall not be liable for any
          indirect, incidental, special, or consequential damages arising from your use of the
          platform, including disputes between users, service quality issues, or data loss.
          Our total liability in any situation shall not exceed the amount you paid to use
          the platform in the preceding 12 months.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 text-base mb-2">11. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. We will notify you of significant changes
          by updating the effective date at the top of this page. Your continued use of the app
          after changes are posted constitutes acceptance of the updated Terms.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 text-base mb-2">12. Contact</h2>
        <p>
          For questions about these Terms, please contact us at:{" "}
          <a href="mailto:support@duttonconnect.com" className="text-primary hover:underline">
            support@duttonconnect.com
          </a>
        </p>
      </section>

      <div className="pt-4 border-t flex gap-4 text-xs text-gray-400">
        <Link href="/privacy">
          <span className="hover:text-gray-600 cursor-pointer">Privacy Policy</span>
        </Link>
        <Link href="/">
          <span className="hover:text-gray-600 cursor-pointer">Back to App</span>
        </Link>
      </div>
    </div>
  );
}
