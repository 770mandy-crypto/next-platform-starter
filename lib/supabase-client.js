import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function saveUserProfile(userId, profile) {
  const { data, error } = await supabase
    .from("user_profiles")
    .upsert({
      user_id: userId,
      business_name: profile.businessName,
      business_category: profile.businessCategory,
      target_audience: profile.targetAudience,
      logo_url: profile.logoUrl,
      primary_color: profile.primaryColor,
      secondary_color: profile.secondaryColor,
      updated_at: new Date(),
    })
    .select();

  if (error) {
    console.error("שגיאה בשמירת פרופיל:", error);
    throw error;
  }
  return data;
}

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("שגיאה בטעינת פרופיל:", error);
  }
  return data;
}

export async function saveCampaign(userId, campaign) {
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      user_id: userId,
      campaign_id: campaign.id,
      business_name: campaign.businessName,
      business_category: campaign.businessCategory,
      offer_description: campaign.offerDescription,
      headline: campaign.headline,
      body: campaign.body,
      cta: campaign.cta,
      whatsapp: campaign.whatsapp,
      instagram: campaign.instagram,
      video_idea: campaign.videoIdea,
      image_url: campaign.imageUrl,
      design: campaign.design || {},
      created_at: new Date(),
    })
    .select();

  if (error) {
    console.error("שגיאה בשמירת קמפיין:", error);
    throw error;
  }
  return data;
}

export async function getUserCampaigns(userId) {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("שגיאה בטעינת קמפיינים:", error);
    throw error;
  }
  return data || [];
}

export async function getCampaign(campaignId) {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("campaign_id", campaignId)
    .single();

  if (error) {
    console.error("שגיאה בטעינת קמפיין:", error);
  }
  return data;
}

export async function updateCampaign(campaignId, updates) {
  const { data, error } = await supabase
    .from("campaigns")
    .update(updates)
    .eq("campaign_id", campaignId)
    .select();

  if (error) {
    console.error("שגיאה בעדכון קמפיין:", error);
    throw error;
  }
  return data;
}
