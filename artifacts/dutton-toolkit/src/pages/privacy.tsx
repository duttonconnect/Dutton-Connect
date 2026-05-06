import { Link } from "wouter";

export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 text-sm text-gray-700 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Privacy Policy</h1>
        <p className="text-gray-500 text-xs">Dutton Connect &mdash; Effective May 6, 2026</p>
      </div>

      <p>
        Dutton Connect ("we," "our," or "us") is a local services marketplace connecting customers
        with independent service professionals. This Privacy Policy explains what information we
        collect, how we use it, and your rights as a user. We use your data only to provide and
        improve the functionality of the app.
      </p>

      <section>
        <h2 className="font-semibold text-gray-900 text-base mb-2">1. Information We Collect</h2>

        <h3 className="font-medium text-gray-800 mb-1">Account Information</h3>
        <p className="mb-3">
          When you create an account, we collect your name, email address, and account role (Pro or
          Customer). Pros may also provide a business name, phone number, service categories,
          service area, and a short bio. This information is used to create your public profile and
          match you with relevant jobs or service providers.
        </p>

        <h3 className="font-medium text-gray-800 mb-1">Messaging Data</h3>
        <p className="mb-3">
          Messages sent between customers and pros through the app are stored in our database to
          allow you to view your conversation history. Message content is used only to deliver
          messages between the parties involved and is not used for advertising.
        </p>

        <h3 className="font-medium text-gray-800 mb-1">Location Information</h3>
        <p className="mb-3">
          If you choose to use location-based features (such as finding nearby pros or job
          requests), the app may request access to your device's location. Location data is used
          only while you are actively using those features and is not stored on our servers
          persistently. You may deny location access at any time in your device settings.
        </p>

        <h3 className="font-medium text-gray-800 mb-1">Uploaded Photos</h3>
        <p className="mb-3">
          Pros may upload a profile photo or business logo. These images are stored in your account
          and displayed on your public profile. Photos are used only to represent your profile to
          customers and are not used for any other purpose.
        </p>

        <h3 className="font-medium text-gray-800 mb-1">Notifications</h3>
        <p className="mb-3">
          If you enable push notifications, we may send you alerts related to new messages, job
          requests, or quotes. Notification permissions are managed through your device settings
          and can be disabled at any time.
        </p>

        <h3 className="font-medium text-gray-800 mb-1">Analytics</h3>
        <p className="mb-3">
          We may collect anonymized usage data (such as which screens are visited most frequently)
          to help us improve the app experience. This data does not include personally identifiable
          information and is never sold to third parties.
        </p>

        <h3 className="font-medium text-gray-800 mb-1">User-Generated Content</h3>
        <p>
          Content you create in the app &mdash; including job postings, quotes, reviews, and notes
          &mdash; is stored in your account. Reviews you leave for pros may be displayed publicly
          on that pro's profile. All other content is private to your account unless you choose to
          share it.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 text-base mb-2">2. How We Use Your Information</h2>
        <p>
          All data collected is used solely to operate and improve the Dutton Connect platform.
          Specifically, we use your information to:
        </p>
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li>Create and manage your account</li>
          <li>Match customers with relevant local service professionals</li>
          <li>Deliver messages between users</li>
          <li>Display public pro profiles to customers browsing the app</li>
          <li>Send notifications you have opted into</li>
          <li>Improve app features based on anonymized usage patterns</li>
        </ul>
        <p className="mt-3">
          We do not use your data for advertising, and we do not sell your personal information to
          any third party.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 text-base mb-2">3. Data Sharing</h2>
        <p>
          We do not sell, rent, or trade your personal information. Your data may be shared in the
          following limited circumstances:
        </p>
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li>
            <span className="font-medium">Within the platform:</span> Pro profile information
            (business name, services, service area, public phone, and profile photo) is visible to
            customers using the app.
          </li>
          <li>
            <span className="font-medium">Service providers:</span> We use Firebase (Google) for
            authentication and data storage. These providers process data on our behalf under their
            own privacy policies.
          </li>
          <li>
            <span className="font-medium">Legal requirements:</span> We may disclose information if
            required by law or to protect the rights, safety, or property of Dutton Connect or
            its users.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 text-base mb-2">4. Data Security</h2>
        <p>
          Your data is stored securely using Firebase, which provides industry-standard encryption
          at rest and in transit. Access to your account data is protected by Firebase
          Authentication. We implement Firestore security rules to ensure users can only access
          data they are authorized to view.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 text-base mb-2">5. Data Retention</h2>
        <p>
          Your account data is retained for as long as your account is active. If you delete your
          account, your personal information will be removed from our systems within a reasonable
          period, except where retention is required by law.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 text-base mb-2">6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li>Access and update your account information at any time from the Profile page</li>
          <li>Delete your account and associated data by contacting us</li>
          <li>Opt out of push notifications through your device settings</li>
          <li>Revoke location access through your device settings</li>
        </ul>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 text-base mb-2">7. Children's Privacy</h2>
        <p>
          Dutton Connect is not intended for use by children under the age of 13. We do not
          knowingly collect personal information from children. If you believe a child has provided
          us with personal information, please contact us and we will delete it promptly.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 text-base mb-2">8. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of significant
          changes by updating the effective date at the top of this page. Continued use of the app
          after changes are posted constitutes your acceptance of the updated policy.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 text-base mb-2">9. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy or wish to exercise your data rights,
          please contact us at:{" "}
          <a href="mailto:support@duttonconnect.com" className="text-primary hover:underline">
            support@duttonconnect.com
          </a>
        </p>
      </section>

      <div className="pt-4 border-t flex gap-4 text-xs text-gray-400">
        <Link href="/terms">
          <span className="hover:text-gray-600 cursor-pointer">Terms of Service</span>
        </Link>
        <Link href="/">
          <span className="hover:text-gray-600 cursor-pointer">Back to App</span>
        </Link>
      </div>
    </div>
  );
}
