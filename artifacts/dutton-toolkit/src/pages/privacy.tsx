import { Link } from "wouter";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12 text-sm text-gray-700 space-y-8">

        {/* Header */}
        <div className="border-b pb-6">
          <div className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">
            Dutton Solutions, LLC
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-500 text-xs">
            Dutton Connect &mdash; Last updated: May 11, 2026
          </p>
        </div>

        {/* Intro */}
        <p className="leading-relaxed">
          Dutton Connect is a local services marketplace owned and operated by{" "}
          <strong>Dutton Solutions, LLC</strong> ("we," "our," or "us"). This Privacy Policy
          describes the information we collect from users of the Dutton Connect mobile application
          and website (collectively, the "Service"), how we use that information, and the choices
          available to you. By using the Service, you agree to the practices described in this
          policy.
        </p>

        {/* Section 1 */}
        <section className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 border-b pb-1">
            1. Information We Collect
          </h2>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Account Information</h3>
            <p className="leading-relaxed">
              When you register for a Dutton Connect account, we collect your name, email address,
              and account role (Pro or Customer). This information is required to create and
              authenticate your account and to match you with relevant services or professionals.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">User Profiles</h3>
            <p className="leading-relaxed">
              Service professionals ("Pros") may optionally provide additional profile information
              including a business name, phone number, service categories, service area, years of
              experience, and a short biography. Customers may create a home profile that includes
              property details. Profile information is used to facilitate connections between
              customers and professionals within the Service.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Messaging and Chat</h3>
            <p className="leading-relaxed">
              Messages sent between users through the Dutton Connect messaging feature are stored
              in our database solely to deliver messages and allow participants to view their
              conversation history. Message content is not used for advertising, profiling, or any
              purpose other than operating the messaging feature.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Uploaded Photos and Content</h3>
            <p className="leading-relaxed">
              Users may upload a profile photo, business logo, job photos, receipt images, or
              other content as part of using the Service. Uploaded files are stored securely using
              Firebase Cloud Storage. Photos and content you upload are used only to operate the
              features you choose to use (e.g., displaying your profile photo to other users) and
              are never sold or shared with third parties for advertising purposes.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Location Data</h3>
            <p className="leading-relaxed">
              Certain features — such as finding nearby service professionals or viewing job
              requests on a map — may request access to your device's location. Location access is
              requested only when needed for a specific feature and is used solely for that
              purpose. Precise location data is not stored on our servers persistently. You may
              deny or revoke location access at any time in your device's Settings app without
              affecting core app functionality.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">User-Generated Content</h3>
            <p className="leading-relaxed">
              Content you create within the Service — including job postings, quotes, invoices,
              reviews, notes, and calendar entries — is stored in your account. Reviews you submit
              for a Pro may be displayed publicly on that Pro's profile. All other content is
              private to your account unless you expressly choose to share it.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Analytics and Crash Reporting</h3>
            <p className="leading-relaxed">
              We may collect anonymized, aggregated usage data (such as which screens are used
              most frequently) to help us understand how the Service is used and to improve the
              user experience. If crash reporting tools are enabled, we may collect technical
              diagnostic information (such as device type, OS version, and crash logs) to identify
              and resolve bugs. This data does not include personally identifiable information and
              is never sold to third parties.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Push Notifications</h3>
            <p className="leading-relaxed">
              If you grant permission for push notifications, we may send you alerts related to
              new messages, job requests, quote updates, or other activity in the Service.
              Notification permissions are managed through your device's Settings app and can be
              disabled at any time.
            </p>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 border-b pb-1">
            2. Firebase Authentication and Google Services
          </h2>
          <p className="leading-relaxed">
            Dutton Connect uses <strong>Firebase</strong>, a platform operated by Google LLC, to
            provide the following core services:
          </p>
          <ul className="list-disc ml-5 space-y-2">
            <li>
              <span className="font-medium">Firebase Authentication</span> — manages account
              creation, login, and session management. Firebase handles your credentials securely
              and we never store your password in plain text.
            </li>
            <li>
              <span className="font-medium">Cloud Firestore</span> — a NoSQL cloud database used
              to store your account data, messages, job records, and other app content.
            </li>
            <li>
              <span className="font-medium">Firebase Cloud Storage</span> — used to store
              uploaded photos and files.
            </li>
            <li>
              <span className="font-medium">Firebase Cloud Messaging (FCM)</span> — used to
              deliver push notifications to your device.
            </li>
          </ul>
          <p className="leading-relaxed">
            Google processes data on our behalf as a service provider and is subject to its own
            privacy policies. You can review Google's privacy policy at{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              policies.google.com/privacy
            </a>
            .
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 border-b pb-1">
            3. How We Use Your Information
          </h2>
          <p>We use the information we collect solely to:</p>
          <ul className="list-disc ml-5 space-y-2">
            <li>Create, authenticate, and manage your account</li>
            <li>Match customers with relevant local service professionals</li>
            <li>Deliver messages between users</li>
            <li>Display Pro profiles and service listings to customers</li>
            <li>Process and display job requests, quotes, and reviews</li>
            <li>Send push notifications you have opted into</li>
            <li>Improve app features based on anonymized usage patterns</li>
            <li>Investigate reports of abuse or violations of our Terms of Service</li>
            <li>Respond to your support requests</li>
          </ul>
          <p className="leading-relaxed">
            We do not use your personal data for advertising, and we do not sell, rent, or
            otherwise transfer your personal information to third parties for their own commercial
            purposes.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 border-b pb-1">
            4. Data Sharing
          </h2>
          <p>We do not sell or rent your personal information. Your data may be shared only in the following limited circumstances:</p>
          <ul className="list-disc ml-5 space-y-2">
            <li>
              <span className="font-medium">Within the platform:</span> Pro profile information
              (business name, services, service area, public phone number, and profile photo) is
              visible to customers who browse the Service. Customer information visible to a Pro is
              limited to what is needed to fulfill a job or quote.
            </li>
            <li>
              <span className="font-medium">Service providers:</span> We use Firebase (Google) and
              other trusted infrastructure providers to operate the Service. These providers
              process data on our behalf and are not permitted to use it for their own purposes.
            </li>
            <li>
              <span className="font-medium">Legal compliance:</span> We may disclose information
              if required by applicable law, regulation, legal process, or governmental request,
              or to protect the rights, safety, or property of Dutton Solutions, LLC or its users.
            </li>
            <li>
              <span className="font-medium">Business transfers:</span> If Dutton Solutions, LLC is
              involved in a merger, acquisition, or sale of assets, your information may be
              transferred as part of that transaction. We will notify you via email or a prominent
              notice in the Service before your information becomes subject to a different privacy
              policy.
            </li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 border-b pb-1">
            5. How Your Data Is Stored and Protected
          </h2>
          <p className="leading-relaxed">
            Your data is stored in Google Firebase, which provides industry-standard encryption
            both at rest and in transit (TLS/HTTPS). Access to your account data is protected by
            Firebase Authentication. We enforce Firestore Security Rules to ensure that users can
            only read or write data they are authorized to access — for example, you cannot access
            another user's private messages or account details.
          </p>
          <p className="leading-relaxed">
            While we implement reasonable technical and organizational safeguards, no method of
            data transmission or storage is 100% secure. We encourage you to use a strong,
            unique password and to protect access to your device.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 border-b pb-1">
            6. Data Retention
          </h2>
          <p className="leading-relaxed">
            Your account data is retained for as long as your account is active or as needed to
            provide the Service. If you request account deletion, we will remove your personal
            information from our active systems within a reasonable period. Some data may be
            retained in backup systems for a limited time or where retention is required by
            applicable law.
          </p>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 border-b pb-1">
            7. Your Rights and Choices
          </h2>
          <p>You have the following rights with respect to your personal information:</p>
          <ul className="list-disc ml-5 space-y-2">
            <li>
              <span className="font-medium">Access and correction:</span> You may view and update
              your account information at any time through the Profile section of the app.
            </li>
            <li>
              <span className="font-medium">Deletion:</span> You may request deletion of your
              account and associated personal data by contacting us at the address below.
            </li>
            <li>
              <span className="font-medium">Push notifications:</span> You may opt out of push
              notifications at any time through your device's Settings app.
            </li>
            <li>
              <span className="font-medium">Location access:</span> You may revoke location
              permissions at any time through your device's Settings app.
            </li>
            <li>
              <span className="font-medium">Photo access:</span> You may revoke camera and photo
              library access at any time through your device's Settings app.
            </li>
          </ul>
          <p className="leading-relaxed">
            If you are a resident of California or another jurisdiction with applicable privacy
            laws (including GDPR), you may have additional rights. Please contact us to exercise
            any of these rights.
          </p>
        </section>

        {/* Section 8 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 border-b pb-1">
            8. Children's Privacy
          </h2>
          <p className="leading-relaxed">
            Dutton Connect is not directed to children under the age of 13. We do not knowingly
            collect personal information from children under 13. If you believe a child under 13
            has provided us with personal information, please contact us immediately and we will
            delete that information from our systems.
          </p>
        </section>

        {/* Section 9 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 border-b pb-1">
            9. Changes to This Policy
          </h2>
          <p className="leading-relaxed">
            We may update this Privacy Policy from time to time to reflect changes in our
            practices or applicable law. When we make material changes, we will update the "Last
            updated" date at the top of this page and, where appropriate, notify you by email or
            through the Service. Your continued use of the Service after changes are posted
            constitutes your acceptance of the revised policy.
          </p>
        </section>

        {/* Section 10 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 border-b pb-1">
            10. Contact Us
          </h2>
          <p className="leading-relaxed">
            If you have questions about this Privacy Policy, wish to exercise your data rights, or
            need to report a privacy concern, please contact us:
          </p>
          <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
            <p className="font-semibold text-gray-900">Dutton Solutions, LLC</p>
            <p className="text-gray-600">Operating as: Dutton Connect</p>
            <p>
              Email:{" "}
              <a
                href="mailto:support@duttonconnect.com"
                className="text-blue-600 hover:underline"
              >
                support@duttonconnect.com
              </a>
            </p>
            <p>
              Website:{" "}
              <a
                href="https://dutton-connect.com"
                className="text-blue-600 hover:underline"
              >
                https://dutton-connect.com
              </a>
            </p>
          </div>
        </section>

        {/* Footer nav */}
        <div className="pt-6 border-t flex flex-wrap gap-4 text-xs text-gray-400">
          <Link href="/terms">
            <span className="hover:text-gray-600 cursor-pointer">Terms of Service</span>
          </Link>
          <Link href="/">
            <span className="hover:text-gray-600 cursor-pointer">Back to App</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
