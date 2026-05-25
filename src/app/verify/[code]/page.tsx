import { verifyCertificate, generateCertificateSvg } from "@/services/gamificationService";
import { notFound } from "next/navigation";
import React from "react";
import { 
  CheckCircle, 
  Share2, 
  Download,
  Info,
  ExternalLink
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface VerifyPageProps {
  params: Promise<{ code: string }>;
}

export default async function VerifyCertificatePage({ params }: VerifyPageProps) {
  const { code } = await params;
  
  // Fetch verified certificate
  const cert = await verifyCertificate(code);
  if (!cert) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#040406] px-4 py-12">
        <div className="glass-panel p-8 max-w-md w-full rounded-2xl border border-red-500/10 text-center space-y-4">
          <span className="text-4xl text-red-500">❌</span>
          <h1 className="text-xl font-bold text-white">Invalid Certificate</h1>
          <p className="text-xs text-gray-500 leading-relaxed">
            The verification code <strong>{code}</strong> does not correspond to any active issued certificate in our database. It may have expired or been revoked.
          </p>
          <a
            href="/dashboard"
            className="w-full inline-flex justify-center py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all"
          >
            Return to Workspace
          </a>
        </div>
      </div>
    );
  }

  // Generate dynamic SVG source
  const svgMarkup = await generateCertificateSvg(
    cert.studentName,
    cert.courseTitle,
    cert.certificateCode,
    new Date(cert.issuedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  );

  // Convert SVG string to base64 for image embedding or dynamic download link
  const base64Svg = typeof btoa !== 'undefined' 
    ? btoa(unescape(encodeURIComponent(svgMarkup))) 
    : Buffer.from(svgMarkup).toString('base64');
  const svgDataUrl = `data:image/svg+xml;base64,${base64Svg}`;

  // Share text strings
  const shareText = `I just mastered and earned my official certification in "${cert.courseTitle}" from AuraAcademy! Verify my credential here:`;
  const shareUrl = `http://localhost:3000/verify/${cert.certificateCode}`; // Update to production domain if needed
  
  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 bg-[#040406]">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* TOP STATUS BAR HEADER */}
        <div className="glass-panel p-5 rounded-2xl border border-emerald-500/10 flex flex-col sm:flex-row justify-between items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
          
          <div className="flex items-center gap-3 text-center sm:text-left">
            <span className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
              <CheckCircle className="h-5.5 w-5.5" />
            </span>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-1.5 justify-center sm:justify-start">
                <span>Verified Academic Credential</span>
              </h1>
              <p className="text-[11px] text-gray-500">Issued by AuraAcademy Educational Board. Securely verified on Supabase ledger.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <a
              href={linkedinShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 px-3 rounded-lg bg-indigo-600/10 border border-indigo-500/10 text-indigo-400 items-center justify-center gap-1.5 hover:bg-indigo-600/20 text-xs font-bold transition-all"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
              <span>LinkedIn</span>
            </a>
            <a
              href={twitterShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 px-3 rounded-lg bg-indigo-600/10 border border-indigo-500/10 text-indigo-400 items-center justify-center gap-1.5 hover:bg-indigo-600/20 text-xs font-bold transition-all"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span>Twitter</span>
            </a>
          </div>
        </div>

        {/* GRID LAYOUT: CERTIFICATE CONTAINER & METADATA SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* CERTIFICATE SVG PREVIEW (2/3 cols) */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* The Certificate Wrapper Frame */}
            <div className="bg-[#09090b]/80 border border-white/5 p-2 sm:p-4 rounded-2xl shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-purple-500/5 to-indigo-500/5 pointer-events-none"></div>
              
              {/* Dynamic SVG output inline with perfect rendering scaling */}
              <div 
                className="w-full aspect-[1000/700] rounded-xl overflow-hidden shadow-lg shadow-black/40 border border-white/5"
                dangerouslySetInnerHTML={{ __html: svgMarkup }}
              />
            </div>

            <div className="flex justify-between items-center gap-4 text-xs text-gray-500 px-1.5">
              <span className="flex items-center gap-1">
                <Info className="h-3.5 w-3.5" />
                <span>Lossless Vector graphic scale. Dynamic retina print ready.</span>
              </span>
              
              {/* Trigger browser window print to print PDF lossless scaling! */}
              <button 
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.print();
                  }
                }}
                className="inline-flex items-center gap-1.5 font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download PDF Print</span>
              </button>
            </div>

          </div>

          {/* CREDENTIAL DETAILS CARD (1/3 cols) */}
          <div className="space-y-6">
            
            {/* AUDIT SUMMARY DETAIL CARD */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Credential Audit Log</h3>
              
              <div className="space-y-4">
                
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Recipient Graduate</p>
                  <p className="text-sm font-bold text-white">{cert.studentName}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Course Title</p>
                  <p className="text-sm font-bold text-white leading-snug">{cert.courseTitle}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Curriculum Syllabus</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{cert.courseDescription}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Verification Code</p>
                  <p className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded inline-block">
                    {cert.certificateCode}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Date of Issuance</p>
                  <p className="text-xs text-gray-400">
                    {new Date(cert.issuedAt).toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

              </div>

              <div className="pt-4 border-t border-white/5 flex flex-col gap-2">
                <a
                  href={`/verify/${cert.certificateCode}`}
                  className="w-full inline-flex justify-center py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all text-center shadow-lg shadow-indigo-900/10"
                >
                  Share Credential Link
                </a>
              </div>
            </div>

            {/* VERIFICATION CRITERIA CARD */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
              <div className="flex gap-2.5 items-start">
                <span className="text-lg">🛡️</span>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white">Cryptographic Integrity</h4>
                  <p className="text-[10px] text-gray-500 leading-normal">
                    Every certificate issued is generated with a unique high-entropy Verification Code that corresponds to a unique record mapped under our secure relational model schema. Duplicate codes are database-level impossible.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* CUSTOM CSS TO HIDE EVERYTHING ELSE EXCEPT THE CERTIFICATE FRAME DURING PRINT MODE */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          /* Hide all UI elements */
          header, nav, footer, button, .glass-panel, a, span, p, h1, h3, h4, style, .text-gray-500 {
            display: none !important;
          }
          /* Frame adjustments */
          .lg\\:col-span-2 {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
          }
          .bg-\\[\\#09090b\\]\\/80 {
            background: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          .rounded-2xl, .rounded-xl {
            border-radius: 0 !important;
          }
        }
      `}} />
    </div>
  );
}
