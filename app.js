const ACCOUNT_KEY = "afterlight.demo.account";
const SESSION_KEY = "afterlight.demo.session";
const POSTS_KEY = "afterlight.demo.posts";

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

async function hashPassword(password, email) {
	if (!globalThis.crypto?.subtle) {
		throw new Error("Le chiffrement du navigateur est indisponible. Ouvre le site en HTTPS pour utiliser cette démo.");
	}
	const bytes = new TextEncoder().encode(`${email}:${password}`);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
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
	const currentAccount = getSession();

	function showForm(name) {
		for (const [formName, form] of Object.entries(forms)) {
			form.hidden = formName !== name;
		}
		for (const tab of tabs) {
			tab.setAttribute("aria-pressed", String(tab.dataset.accountTab === name));
		}
		setMessage(message, "");
	}

	function renderState() {
		const account = getSession();
		if (!account) {
			state.innerHTML = "<h2>Aucun compte connecté</h2><p class=\"muted\">Crée un profil de démonstration ou connecte-toi sur ce navigateur.</p>";
			for (const tab of tabs) tab.hidden = false;
			return;
		}
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
		profileForm.addEventListener("submit", event => {
			event.preventDefault();
			try {
				const updatedAccount = getAccount();
				if (!updatedAccount) throw new Error("Profil AFTERLIGHT introuvable sur ce navigateur.");
				updatedAccount.name = input.value.trim();
				writeJson(ACCOUNT_KEY, updatedAccount);
				renderState();
				setMessage(message, "Ton nom affiché a été mis à jour.");
			} catch (error) {
				setMessage(message, error.message, true);
			}
		});
		const logout = document.createElement("button");
		logout.type = "button";
		logout.textContent = "Se déconnecter";
		logout.addEventListener("click", () => {
			localStorage.removeItem(SESSION_KEY);
			renderState();
			showForm("login");
			setMessage(message, "Tu es déconnecté.");
		});
		state.append(heading, details, profileForm, logout);
		for (const tab of tabs) tab.hidden = true;
		signupForm.hidden = true;
		loginForm.hidden = true;
	}

	for (const tab of tabs) tab.addEventListener("click", () => showForm(tab.dataset.accountTab));

	signupForm.addEventListener("submit", async event => {
		event.preventDefault();
		const data = new FormData(signupForm);
		const name = String(data.get("name")).trim();
		const email = String(data.get("email")).trim().toLowerCase();
		const password = String(data.get("password"));
		try {
			if (getAccount()) throw new Error("Un profil existe déjà dans ce navigateur. Connecte-toi ou efface les données locales du site pour en créer un autre.");
			const passwordHash = await hashPassword(password, email);
			writeJson(ACCOUNT_KEY, { name, email, passwordHash });
			writeJson(SESSION_KEY, email);
			signupForm.reset();
			renderState();
			setMessage(message, "Profil de démonstration créé. Bienvenue sur Afterlight !");
		} catch (error) {
			setMessage(message, error.message, true);
		}
	});

	loginForm.addEventListener("submit", async event => {
		event.preventDefault();
		const data = new FormData(loginForm);
		const email = String(data.get("email")).trim().toLowerCase();
		const password = String(data.get("password"));
		try {
			const account = getAccount();
			const passwordHash = await hashPassword(password, email);
			if (!account || account.email !== email || account.passwordHash !== passwordHash) {
				throw new Error("Adresse e-mail ou mot de passe incorrect.");
			}
			writeJson(SESSION_KEY, email);
			loginForm.reset();
			renderState();
			setMessage(message, "Tu es connecté.");
		} catch (error) {
			setMessage(message, error.message, true);
		}
	});

	renderState();
	if (!currentAccount) showForm("signup");
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
