import React, { useMemo, useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Audio } from "expo-av";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";

const LANGUAGES = [
  { label: "English", code: "en-IN" }, { label: "हिन्दी", code: "hi-IN" },
  { label: "తెలుగు", code: "te-IN" }, { label: "தமிழ்", code: "ta-IN" },
  { label: "ಕನ್ನಡ", code: "kn-IN" }, { label: "മലയാളം", code: "ml-IN" },
  { label: "मराठी", code: "mr-IN" }, { label: "বাংলা", code: "bn-IN" },
  { label: "ગુજરાતી", code: "gu-IN" }, { label: "ਪੰਜਾਬੀ", code: "pa-IN" }
];
const WEBHOOK_URL = process.env.EXPO_PUBLIC_N8N_WEBHOOK_URL ?? "";
type Advice = { fruit?: string; gi?: number; gl?: number; season?: string; best_time?: string; diabetic_safety?: string; pairing_tip?: string; portion?: string; renal_safety?: string; potassium?: number; hypertension_safety?: string; ckd_safety?: string; spoken_response?: string; audio_url?: string; image_url?: string; description?: string; language_code?: string; language?: string; [key: string]: unknown };
function normalizeResponse(raw: any): Advice | null {
  let value = raw;
  for (let i = 0; i < 4; i++) {
    if (typeof value === "string") { try { value = JSON.parse(value); } catch { return null; } continue; }
    if (Array.isArray(value)) { value = value[0]; continue; }
    if (value && typeof value === "object" && !("fruit" in value) && !("spoken_response" in value)) {
      const inner = value.output ?? value.json ?? value.data ?? value.body;
      if (inner !== undefined) { value = inner; continue; }
    }
    break;
  }
  return value && typeof value === "object" && Object.keys(value).length ? value as Advice : null;
}

export default function App() {
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Advice | null>(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  useSpeechRecognitionEvent("start", () => setListening(true));
  useSpeechRecognitionEvent("end", () => setListening(false));
  useSpeechRecognitionEvent("result", e => { const t = e.results?.[0]?.transcript; if (t) setQuestion(t); });
  useSpeechRecognitionEvent("error", e => { setListening(false); setError(e.message || "Speech recognition failed."); });
  const activeLanguage = useMemo(() => language.code, [language]);

  async function ask() {
    if (!question.trim()) return;
    if (!WEBHOOK_URL) { setError("Set EXPO_PUBLIC_N8N_WEBHOOK_URL in .env before asking."); return; }
    setLoading(true); setError(""); setAnswer(null);
    try {
      const res = await fetch(WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" }, body: JSON.stringify({ query: question.trim(), language: activeLanguage }) });
      if (!res.ok) throw new Error(`Request failed (${res.status}).`);
      const raw = await res.text();
      const data = normalizeResponse(raw);
      if (!data) throw new Error("FruitBuddie returned an answer we couldn't read.");
      setAnswer(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setLoading(false); }
  }
  async function speak() {
    setError("");
    try {
      const p = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!p.granted) { setError("Microphone permission is needed."); return; }
      ExpoSpeechRecognitionModule.start({ lang: activeLanguage, interimResults: true, continuous: false });
    } catch (e) { setError(e instanceof Error ? e.message : "Voice input unavailable."); }
  }
  async function playAudio() {
    if (!answer?.audio_url || typeof answer.audio_url !== "string") return;
    try { const { sound } = await Audio.Sound.createAsync({ uri: answer.audio_url }); await sound.playAsync(); }
    catch { setError("Audio playback failed."); }
  }

  return <SafeAreaView style={s.safe}>
    <StatusBar barStyle="light-content" backgroundColor="#071C17" />
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <View style={s.brandBlock}><View style={s.mark}><Text style={{fontSize:25}}>🍃</Text></View><Text style={s.brand}>fruitbuddie</Text><Text style={s.tagline}>A little more goodness, every day.</Text></View>
      <View style={s.hero}><Text style={s.eyebrow}>YOUR EVERYDAY NUTRITION COMPANION</Text><Text style={s.heading}>Make every{"\n"}bite count.</Text><Text style={s.subheading}>Ask about fruits, nutrition and everyday food choices—in the language you’re comfortable with.</Text></View>
      <View style={s.card}>
        <Text style={s.label}>CHOOSE YOUR LANGUAGE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.languages}>
          {LANGUAGES.map(item => <TouchableOpacity key={item.code} onPress={() => setLanguage(item)} style={[s.chip, language.code === item.code && s.chipActive]}><Text style={[s.chipText, language.code === item.code && s.chipTextActive]}>{item.label}</Text></TouchableOpacity>)}
        </ScrollView>
        <Text style={[s.label,{marginTop:16,marginBottom:10}]}>WHAT WOULD YOU LIKE TO KNOW?</Text>
        <TextInput value={question} onChangeText={setQuestion} placeholder="Ask me about a fruit or nutrition..." placeholderTextColor="#789087" multiline style={s.input}/>
        <View style={s.actions}>
          <TouchableOpacity style={[s.voice, listening && s.voiceActive]} onPress={() => listening ? ExpoSpeechRecognitionModule.stop() : speak()}><Text style={s.voiceText}>{listening ? "■ Stop" : "🎙 Speak"}</Text></TouchableOpacity>
          <TouchableOpacity style={s.ask} onPress={ask} disabled={loading}>{loading ? <ActivityIndicator color="#09251C"/> : <Text style={s.askText}>Ask FruitBuddie  →</Text>}</TouchableOpacity>
        </View>
      </View>
      {!!error && <Text style={s.error}>{error}</Text>}
      {answer && <View style={s.answer}>
        <Text style={s.eyebrow}>YOUR FRUITBUDDIE INSIGHT</Text>
        <Text style={s.answerTitle}>{String(answer.fruit ?? "Your fruit insight")}</Text>
        {!!answer.description && <Text style={s.answerBody}>{answer.description}</Text>}
        <View style={s.metrics}>
          {answer.gi !== undefined && <View style={s.metric}><Text style={s.metricLabel}>GLYCAEMIC INDEX</Text><Text style={s.metricValue}>{answer.gi}</Text></View>}
          {answer.gl !== undefined && <View style={s.metric}><Text style={s.metricLabel}>GLYCAEMIC LOAD</Text><Text style={s.metricValue}>{answer.gl}</Text></View>}
          {answer.potassium !== undefined && <View style={s.metric}><Text style={s.metricLabel}>POTASSIUM</Text><Text style={s.metricValue}>{answer.potassium}</Text></View>}
        </View>
        {([["DIABETES", answer.diabetic_safety], ["PORTION", answer.portion], ["BEST TIME", answer.best_time], ["SEASON", answer.season], ["PAIRING TIP", answer.pairing_tip], ["KIDNEY / RENAL SAFETY", answer.renal_safety ?? answer.ckd_safety], ["BLOOD PRESSURE", answer.hypertension_safety]] as const).filter(([,v]) => !!v).map(([label,value]) => <View key={label} style={s.list}><Text style={s.label}>{label}</Text><Text style={s.bullet}>{String(value)}</Text></View>)}
        {!!answer.spoken_response && <Text style={s.answerBody}>{answer.spoken_response}</Text>}
        {!!answer.audio_url && <TouchableOpacity style={s.audio} onPress={playAudio}><Text style={s.audioText}>▶  Listen to the answer</Text></TouchableOpacity>}
      </View>}
      <View style={s.disclaimer}><Text style={s.disclaimerTitle}>A helpful companion, not a doctor.</Text><Text style={s.disclaimerText}>FruitBuddie provides general nutrition information, not medical advice. For personal dietary needs or medical conditions, consult a qualified healthcare professional.</Text></View>
      <Text style={s.footer}>MADE WITH CARE  ·  FRUITBUDDIE</Text>
    </ScrollView>
  </SafeAreaView>;
}
const s = StyleSheet.create({
 safe:{flex:1,backgroundColor:"#071C17"}, container:{padding:22,paddingBottom:40},
 brandBlock:{alignItems:"center",paddingTop:18,paddingBottom:28}, mark:{width:48,height:48,borderRadius:16,backgroundColor:"#153C2F",alignItems:"center",justifyContent:"center",marginBottom:10},
 brand:{color:"#F3E9C8",fontSize:25,fontWeight:"800"},tagline:{color:"#9FB7A9",fontSize:12,marginTop:5},
 hero:{marginBottom:24},eyebrow:{color:"#D4B96D",fontSize:10,fontWeight:"800",letterSpacing:2},heading:{color:"#F6F2E6",fontSize:43,lineHeight:48,fontWeight:"800",marginTop:12},
 subheading:{color:"#B6C9BE",fontSize:14,lineHeight:22,marginTop:12,maxWidth:330},
 card:{backgroundColor:"#102B22",borderColor:"#24483A",borderWidth:1,borderRadius:22,padding:18},label:{color:"#D4B96D",fontSize:10,fontWeight:"800",letterSpacing:1.4},
 languages:{gap:8,paddingVertical:13},chip:{borderWidth:1,borderColor:"#365848",borderRadius:18,paddingHorizontal:13,paddingVertical:9},chipActive:{backgroundColor:"#D8C27F",borderColor:"#D8C27F"},
 chipText:{color:"#D3E0D7",fontSize:12,fontWeight:"600"},chipTextActive:{color:"#10271E"},
 input:{minHeight:105,color:"#F5F2E9",backgroundColor:"#0A211A",borderColor:"#315544",borderWidth:1,borderRadius:14,padding:14,fontSize:15,textAlignVertical:"top"},
 actions:{flexDirection:"row",gap:10,marginTop:14},voice:{borderColor:"#557565",borderWidth:1,borderRadius:13,paddingHorizontal:16,minHeight:48,justifyContent:"center"},voiceActive:{borderColor:"#D8C27F",backgroundColor:"#2A3D2C"},voiceText:{color:"#E3EBDD",fontWeight:"700",fontSize:13},
 ask:{flex:1,backgroundColor:"#D8C27F",borderRadius:13,minHeight:48,justifyContent:"center",alignItems:"center",paddingHorizontal:10},askText:{color:"#10271E",fontWeight:"800",fontSize:13},
 error:{color:"#FFB6A8",marginTop:14,lineHeight:20},answer:{marginTop:20,padding:20,borderRadius:20,backgroundColor:"#15352A",borderWidth:1,borderColor:"#41644F"},
 answerTitle:{color:"#F4EEDC",fontSize:23,fontWeight:"800",marginTop:10},answerBody:{color:"#D6E1D8",fontSize:14,lineHeight:22,marginTop:12},list:{marginTop:17},bullet:{color:"#D6E1D8",fontSize:13,lineHeight:21,marginTop:4},
 metrics:{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:16},metric:{backgroundColor:"#0D261E",borderRadius:12,padding:12,minWidth:90},metricLabel:{color:"#AFC2B6",fontSize:9,fontWeight:"700"},metricValue:{color:"#F4EEDC",fontSize:20,fontWeight:"800",marginTop:4},audio:{alignSelf:"flex-start",marginTop:18,borderRadius:20,backgroundColor:"#D8C27F",paddingHorizontal:15,paddingVertical:10},audioText:{color:"#10271E",fontWeight:"800",fontSize:12},
 disclaimer:{marginTop:25,padding:16,borderLeftWidth:2,borderLeftColor:"#C9B36F",backgroundColor:"#0D261E"},disclaimerTitle:{color:"#E7D8AA",fontSize:12,fontWeight:"800",marginBottom:6},disclaimerText:{color:"#AFC2B6",fontSize:11,lineHeight:18},
 footer:{color:"#607D6D",textAlign:"center",fontSize:9,letterSpacing:2,marginTop:24}
});
