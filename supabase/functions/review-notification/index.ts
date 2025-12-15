import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReviewNotificationRequest {
  review_id: string;
  employee_id: string;
  reviewer_name: string;
  review_period: string;
  overall_rating: number | null;
  status: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: ReviewNotificationRequest = await req.json();

    console.log("Processing review notification:", payload);

    // Get employee details
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, first_name, last_name, email, user_id")
      .eq("id", payload.employee_id)
      .single();

    if (employeeError || !employee) {
      console.error("Error fetching employee:", employeeError);
      throw new Error("Employee not found");
    }

    console.log("Sending notification to:", employee.email);

    const ratingText = payload.overall_rating 
      ? `${payload.overall_rating}/5` 
      : "Pending";

    const statusText = payload.status === "completed" 
      ? "has been completed" 
      : payload.status === "draft" 
        ? "has been saved as a draft" 
        : "is pending your review";

    // Create in-app notification
    if (employee.user_id) {
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: employee.user_id,
          title: "Performance Review Submitted",
          message: `Your ${payload.review_period} performance review ${statusText}. Rating: ${ratingText}`,
          type: "info",
          link: "/performance"
        });

      if (notifError) {
        console.error("Error creating notification:", notifError);
      } else {
        console.log("In-app notification created successfully");
      }
    }

    // Send email notification
    const emailResult = await resend.emails.send({
      from: "HR System <onboarding@resend.dev>",
      to: [employee.email],
      subject: `Performance Review ${payload.status === "completed" ? "Completed" : "Update"} - ${payload.review_period}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Performance Review ${payload.status === "completed" ? "Completed" : "Update"}</h2>
          <p>Hi ${employee.first_name},</p>
          <p>Your ${payload.review_period} performance review ${statusText}.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Review Period:</strong> ${payload.review_period}</p>
            <p style="margin: 10px 0 0;"><strong>Reviewer:</strong> ${payload.reviewer_name}</p>
            <p style="margin: 10px 0 0;"><strong>Overall Rating:</strong> ${ratingText}</p>
            <p style="margin: 10px 0 0;"><strong>Status:</strong> ${payload.status.charAt(0).toUpperCase() + payload.status.slice(1)}</p>
          </div>
          
          <p>Log in to your HR portal to view the full details of your review.</p>
          
          <p style="margin-top: 30px;">Best regards,<br>HR Team</p>
        </div>
      `,
    });

    console.log("Email sent:", emailResult);

    return new Response(
      JSON.stringify({ success: true, emailResult }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in review-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
