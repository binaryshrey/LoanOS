// app/support/page.tsx
import { withAuth } from "@workos-inc/authkit-nextjs";
import DashboardLayout from "@/components/DashboardLayout";
import { redirect } from "next/navigation";
import { Mail, MessageSquare, FileQuestion, ExternalLink } from "lucide-react";

export default async function SupportPage() {
  const { user } = await withAuth();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <DashboardLayout user={user} currentPage="support">
      <div className="px-4 pb-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Support</h1>
          <p className="mt-2 text-sm text-gray-600">
            Get help and support for using LoanOS.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Contact Support */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-neutral-200 p-3 rounded-lg">
                <Mail className="w-6 h-6 text-neutral-800" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Contact Support
                </h2>
                <p className="text-sm text-gray-600">Get help from our team</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Have a question or need assistance? Our support team is here to
              help you with any issues or questions you might have.
            </p>
            <a
              href="mailto:support@loanos.com"
              className="inline-flex items-center gap-2 text-sm font-medium text-neutral-800 hover:text-neutral-900"
            >
              Email Support
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Documentation */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-neutral-200 p-3 rounded-lg">
                <FileQuestion className="w-6 h-6 text-neutral-800" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Documentation
                </h2>
                <p className="text-sm text-gray-600">Learn how to use LoanOS</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Explore our comprehensive documentation to learn about all the
              features and capabilities of LoanOS.
            </p>
            <div className="space-y-2">
              <a
                href="#"
                className="block text-sm text-neutral-800 hover:text-neutral-900"
              >
                Getting Started Guide
              </a>
              <a
                href="#"
                className="block text-sm text-neutral-800 hover:text-neutral-900"
              >
                User Manual
              </a>
              <a
                href="#"
                className="block text-sm text-neutral-800 hover:text-neutral-900"
              >
                API Documentation
              </a>
            </div>
          </div>

          {/* Community */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-neutral-200 p-3 rounded-lg">
                <MessageSquare className="w-6 h-6 text-neutral-800" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Community
                </h2>
                <p className="text-sm text-gray-600">
                  Connect with other users
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Join our community to share experiences, get tips, and connect
              with other LoanOS users.
            </p>
            <a
              href="https://github.com/binaryshrey/LoanOS/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-neutral-800 hover:text-neutral-900"
            >
              Join Community
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Report an Issue */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-3 rounded-lg">
                <FileQuestion className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Report an Issue
                </h2>
                <p className="text-sm text-gray-600">
                  Found a bug? Let us know
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Help us improve LoanOS by reporting any bugs or issues you
              encounter.
            </p>
            <a
              href="https://github.com/binaryshrey/LoanOS/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-neutral-800 hover:text-neutral-900"
            >
              Report Issue
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                How do I create a new loan session?
              </h3>
              <p className="text-sm text-gray-600">
                Click on the "+ New Loan Session" button in your dashboard to
                start a new loan intelligence session.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                What file types can I upload?
              </h3>
              <p className="text-sm text-gray-600">
                You can upload documents in PDF, DOCX, and other common document
                formats.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                How secure is my data?
              </h3>
              <p className="text-sm text-gray-600">
                We use industry-standard encryption and security practices to
                protect your data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
