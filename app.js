const ACCOUNT_KEY = "afterlight.demo.account";
const SESSION_KEY = "afterlight.demo.session";
const POSTS_KEY = "afterlight.demo.posts";
const supabaseConfig = globalThis.AFTERLIGHT_SUPABASE_CONFIG;
const supabaseUrlIsValid = (() => {
	try {
		const url = new URL(supabaseConfig?.url);
		return url.protocol === "https:" && url.hostname.endsWith(".supabase.co");
	} catch {
		return false;
	}
})();
const supabaseClient = globalThis.supabase && supabaseUrlIsValid && supabaseConfig?.publicKey
	? globalThis.supabase.createClient(supabaseConfig.url, supabaseConfig.publicKey)
	: null;

function readJson(key, fallback) {
	try {
		const value = localStorage.getItem(key);
		return value ? JSON.parse(value) : fallback;
	} catch (error) {
		console.error(`Impossible de lire les données Afterlight (${key}).`, error);
		throw new Error("Le stockage local est inaccessible dans ce navigateur.");
	}
}

function writeJson(key, value) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch (error) {
		console.error(`Impossible d'enregistrer les données Afterlight (${key}).`, error);
		throw new Error("Impossible d'enregistrer les données. Vérifie les réglages de stockage du navigateur.");
	}
}

function setMessage(element, message, isError = false) {
	if (!element) return;
	element.textContent = message;
	element.dataset.error = String(isError);
}

function getAccount() {
	return readJson(ACCOUNT_KEY, null);
}

function getSession() {
	const email = readJson(SESSION_KEY, null);
	const account = getAccount();
	return account && account.email === email ? account : null;
}

function initializeAccountPage() {
	const state = document.querySelector("#account-state");
	if (!state) return;

	const message = document.querySelector("#account-message");
	const signupForm = document.querySelector("#signup-form");
	const loginForm = document.querySelector("#login-form");
	const tabs = document.querySelectorAll("[data-account-tab]");
	const forms = { signup: signupForm, login: loginForm };

	function showForm(name) {
		for (const [formName, form] of Object.entries(forms)) {
			form.hidden = formName !== name;
		}
		for (const tab of tabs) {
			tab.setAttribute("aria-pressed", String(tab.dataset.accountTab === name));
		}
		setMessage(message, "");
	}

	function cacheUserForDemoForum(user) {
		const account = { name: user.user_metadata?.display_name || user.email, email: user.email };
		writeJson(ACCOUNT_KEY, account);
		writeJson(SESSION_KEY, account.email);
		return account;
	}

	function clearDemoForumSession() {
		localStorage.removeItem(ACCOUNT_KEY);
		localStorage.removeItem(SESSION_KEY);
	}

	function renderState(user) {
		if (!user) {
			state.innerHTML = "<h2>Aucun compte connecté</h2><p class=\"muted\">Crée un profil ou connecte-toi avec Supabase.</p>";
			for (const tab of tabs) tab.hidden = false;
			showForm("signup");
			return;
		}
		const account = cacheUserForDemoForum(user);
		state.replaceChildren();
		const heading = document.createElement("h2");
		heading.textContent = `Bienvenue, ${account.name}`;
		const details = document.createElement("p");
		details.className = "muted";
		details.textContent = account.email;
		const profileForm = document.createElement("form");
		profileForm.className = "profile-form";
		const label = document.createElement("label");
		label.className = "form-field";
		label.textContent = "Nom affiché";
		const input = document.createElement("input");
		input.name = "name";
		input.value = account.name;
		input.maxLength = 32;
		input.required = true;
		label.append(input);
		const save = document.createElement("button");
		save.type = "submit";
		save.textContent = "Enregistrer le nom";
		profileForm.append(label, save);
		profileForm.addEventListener("submit", async event => {
			event.preventDefault();
			try {
				const name = input.value.trim();
				if (!name) throw new Error("Saisis un nom affiché.");
				const { data, error } = await supabaseClient.auth.updateUser({ data: { display_name: name } });
				if (error) throw error;
				renderState(data.user);
				setMessage(message, "Ton nom affiché a été mis à jour.");
			} catch (error) {
				setMessage(message, error.message || "Impossible de mettre à jour ton profil.", true);
			}
		});
		const logout = document.createElement("button");
		logout.type = "button";
		logout.textContent = "Se déconnecter";
		logout.addEventListener("click", async () => {
			try {
				const { error } = await supabaseClient.auth.signOut();
				if (error) throw error;
				clearDemoForumSession();
				renderState(null);
				showForm("login");
				setMessage(message, "Tu es déconnecté.");
			} catch (error) {
				setMessage(message, error.message || "Impossible de te déconnecter.", true);
			}
		});
		state.append(heading, details, profileForm, logout);
		for (const tab of tabs) tab.hidden = true;
		signupForm.hidden = true;
		loginForm.hidden = true;
	}

	for (const tab of tabs) tab.addEventListener("click", () => showForm(tab.dataset.accountTab));

	if (!globalThis.supabase) {
		state.innerHTML = "<h2>Supabase inaccessible</h2><p class=\"muted\">La bibliothèque Supabase n'a pas pu être chargée. Vérifie ta connexion, puis recharge la page.</p>";
		for (const form of Object.values(forms)) form.hidden = true;
		for (const tab of tabs) tab.hidden = true;
		setMessage(message, "Impossible de charger Supabase Auth.", true);
		return;
	}

	if (!supabaseClient) {
		state.innerHTML = "<h2>Configuration Supabase à corriger</h2><p class=\"muted\">Dans supabase-config.js, mets l'URL API affichée dans les paramètres de ton projet Supabase (elle ressemble à https://abcdefghijkl.supabase.co) dans url. L'adresse playafterlight.github.io est celle du site, pas celle de l'API. Garde la clé publique publishable/anon dans publicKey.</p>";
		for (const form of Object.values(forms)) form.hidden = true;
		for (const tab of tabs) tab.hidden = true;
		setMessage(message, "Aucun mot de passe n'est enregistré : l'URL ou la clé publique Supabase manque ou est invalide.", true);
		return;
	}

	signupForm.addEventListener("submit", async event => {
		event.preventDefault();
		const data = new FormData(signupForm);
		const name = String(data.get("name")).trim();
		const email = String(data.get("email")).trim().toLowerCase();
		const password = String(data.get("password"));
		try {
			if (!name) throw new Error("Saisis un nom affiché.");
			const { data: result, error } = await supabaseClient.auth.signUp({
				email,
				password,
				options: {
					data: { display_name: name },
					emailRedirectTo: window.location.href.split("#")[0]
				}
			});
			if (error) throw error;
			signupForm.reset();
			if (result.session) {
				renderState(result.user);
				setMessage(message, "Compte AFTERLIGHT créé. Bienvenue !");
			} else {
				setMessage(message, "Compte créé. Vérifie ta boîte e-mail pour confirmer ton adresse.");
			}
		} catch (error) {
			setMessage(message, error.message || "Impossible de créer le compte.", true);
		}
	});

	loginForm.addEventListener("submit", async event => {
		event.preventDefault();
		const data = new FormData(loginForm);
		const email = String(data.get("email")).trim().toLowerCase();
		const password = String(data.get("password"));
		try {
			const { data: result, error } = await supabaseClient.auth.signInWithPassword({ email, password });
			if (error) throw error;
			loginForm.reset();
			renderState(result.user);
			setMessage(message, "Tu es connecté.");
		} catch (error) {
			setMessage(message, error.message || "Impossible de te connecter.", true);
		}
	});

	supabaseClient.auth.getSession().then(({ data, error }) => {
		if (error) throw error;
		if (data.session) {
			renderState(data.session.user);
		} else {
			clearDemoForumSession();
			renderState(null);
		}
	}).catch(error => {
		setMessage(message, error.message || "Impossible de vérifier la session Supabase.", true);
	});
}

function initializeForum() {
	const list = document.querySelector("#forum-list");
	if (!list) return;

	const loginNotice = document.querySelector("#forum-login-notice");
	const form = document.querySelector("#forum-form");
	const account = getSession();
	if (!account) {
		loginNotice.hidden = false;
		form.hidden = true;
	} else {
		loginNotice.hidden = true;
		form.hidden = false;
		document.querySelector("#forum-author").textContent = `Connecté·e en tant que ${account.name}`;
	}

	function renderPosts() {
		const posts = readJson(POSTS_KEY, []);
		list.replaceChildren();
		if (posts.length === 0) {
			const empty = document.createElement("p");
			empty.className = "muted";
			empty.textContent = "Aucune discussion pour le moment. Lance le premier sujet !";
			list.append(empty);
			return;
		}
		for (const post of [...posts].reverse()) {
			const article = document.createElement("article");
			article.className = "forum-post";
			const title = document.createElement("h3");
			title.textContent = post.title;
			const content = document.createElement("p");
			content.textContent = post.content;
			const meta = document.createElement("p");
			meta.className = "forum-post-meta";
			meta.textContent = `${post.author} · ${post.date}`;
			article.append(title, content, meta);
			list.append(article);
		}
	}

	form.addEventListener("submit", event => {
		event.preventDefault();
		const message = document.querySelector("#forum-message");
		const data = new FormData(form);
		const title = String(data.get("title")).trim();
		const content = String(data.get("content")).trim();
		try {
			if (!getSession()) throw new Error("Connecte-toi pour participer à la discussion.");
			const posts = readJson(POSTS_KEY, []);
			posts.push({ title, content, author: account.name, date: new Date().toLocaleDateString("fr-FR") });
			writeJson(POSTS_KEY, posts);
			form.reset();
			setMessage(message, "Ton sujet a été publié sur ce navigateur.");
			renderPosts();
		} catch (error) {
			setMessage(message, error.message, true);
		}
	});

	renderPosts();
}

initializeAccountPage();
initializeForum();
