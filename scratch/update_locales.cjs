const fs = require('fs');

const authKeys = {
  signInTitle: "Connectez-vous à votre compte",
  emailLabel: "Email (Identifiant)",
  emailPlaceholder: "Entrez votre email",
  passwordLabel: "Mot de passe",
  passwordPlaceholder: "Entrez votre mot de passe",
  forgotPassword: "Mot de passe oublié ?",
  rememberMe: "Se souvenir de moi",
  signInBtn: "SE CONNECTER",
  notRegistered: "Pas encore inscrit ?",
  createAccount: "Créer un compte",
  error: "Échec de la connexion",
  login: "Connexion",
  google: "Continuer avec Google",
  or: "ou",
  noAccount: "Pas de compte ? En créer un",
  haveAccount: "Déjà un compte ? Se connecter",
  loading: "Chargement..."
};

const regKeys = {
  title: "Créer un compte",
  hint: "Pas d'e-mail nécessaire — un identifiant vous sera attribué.",
  studentBtn: "Étudiant / Parent",
  teacherBtn: "Enseignant",
  nameLabel: "Nom et prénom",
  namePlaceholder: "ex: Rania Keghouche",
  phoneLabel: "Téléphone",
  levelLabel: "Niveau",
  parentNameLabel: "Nom du parent",
  parentPhoneLabel: "Téléphone parent",
  subjectsLabel: "Matière(s) enseignée(s) — à choisir dans la liste",
  addSubjectOption: "— Ajouter une matière —",
  noSubjectsMsg: "Aucune matière disponible — l'administration doit d'abord en créer.",
  passwordHint: "Mot de passe (6+ caractères)",
  submitBtn: "Envoyer ma demande",
  sending: "Envoi...",
  backBtn: "Retour"
};

const langs = ['fr', 'en', 'ar'];

langs.forEach(lang => {
  const file = `./src/locales/${lang}.json`;
  try {
    let data = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    // Default translations
    let langAuth = { ...authKeys };
    let langReg = { ...regKeys };
    
    if (lang === 'en') {
      langAuth = {
        signInTitle: "Sign In to your Account",
        emailLabel: "Email",
        emailPlaceholder: "Enter Email",
        passwordLabel: "Password",
        passwordPlaceholder: "Enter Password",
        forgotPassword: "Forgot password?",
        rememberMe: "Remember me",
        signInBtn: "SIGN IN",
        notRegistered: "Not registered yet?",
        createAccount: "Create an account",
        error: "Login failed",
        login: "Login",
        google: "Continue with Google",
        or: "or",
        noAccount: "No account? Create one",
        haveAccount: "Already have an account? Sign in",
        loading: "Loading..."
      };
      langReg = {
        title: "Create an account",
        hint: "No email required — an ID will be assigned to you.",
        studentBtn: "Student / Parent",
        teacherBtn: "Teacher",
        nameLabel: "Full Name",
        namePlaceholder: "e.g. John Doe",
        phoneLabel: "Phone",
        levelLabel: "Level",
        parentNameLabel: "Parent's Name",
        parentPhoneLabel: "Parent's Phone",
        subjectsLabel: "Taught subject(s) — choose from list",
        addSubjectOption: "— Add a subject —",
        noSubjectsMsg: "No subjects available — administration must create them first.",
        passwordHint: "Password (6+ characters)",
        submitBtn: "Send my request",
        sending: "Sending...",
        backBtn: "Back"
      };
    } else if (lang === 'ar') {
      langAuth = {
        signInTitle: "تسجيل الدخول إلى حسابك",
        emailLabel: "البريد الإلكتروني",
        emailPlaceholder: "أدخل البريد الإلكتروني",
        passwordLabel: "كلمة المرور",
        passwordPlaceholder: "أدخل كلمة المرور",
        forgotPassword: "هل نسيت كلمة المرور؟",
        rememberMe: "تذكرني",
        signInBtn: "تسجيل الدخول",
        notRegistered: "غير مسجل بعد؟",
        createAccount: "إنشاء حساب",
        error: "فشل تسجيل الدخول",
        login: "تسجيل الدخول",
        google: "المتابعة باستخدام Google",
        or: "أو",
        noAccount: "ليس لديك حساب؟ إنشاء واحد",
        haveAccount: "هل لديك حساب بالفعل؟ تسجيل الدخول",
        loading: "جار التحميل..."
      };
      langReg = {
        title: "إنشاء حساب",
        hint: "لا حاجة لبريد إلكتروني - سيتم تعيين معرف لك.",
        studentBtn: "طالب / ولي أمر",
        teacherBtn: "معلم",
        nameLabel: "الاسم الكامل",
        namePlaceholder: "مثل: رانيا",
        phoneLabel: "رقم الهاتف",
        levelLabel: "المستوى",
        parentNameLabel: "اسم ولي الأمر",
        parentPhoneLabel: "هاتف ولي الأمر",
        subjectsLabel: "المواد المُدرّسة - اختر من القائمة",
        addSubjectOption: "— إضافة مادة —",
        noSubjectsMsg: "لا توجد مواد متاحة - يجب على الإدارة إنشاؤها أولاً.",
        passwordHint: "كلمة المرور (6+ أحرف)",
        submitBtn: "إرسال طلبي",
        sending: "جاري الإرسال...",
        backBtn: "رجوع"
      };
    }
    
    // Clean up duplicate keys inside fr if they exist, and assign properly
    data.auth = { ...data.auth, ...langAuth };
    data.reg = { ...langReg };

    // Clean up my previous bad injection
    delete data.signInTitle;
    delete data.emailLabel;
    
    // Write back
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log(`Updated ${lang}.json`);
  } catch(e) {
    console.error(e);
  }
});
