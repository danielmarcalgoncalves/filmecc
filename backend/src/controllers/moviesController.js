const axios = require('axios');

// Cache em memória para evitar chamadas excessivas e otimizar tempo de resposta
let moviesCache = {
  data: null,
  timestamp: 0,
  personId: null
};

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

async function getTomHanksMovies(req, res) {
  try {
    const apiKey = process.env.TMDB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: 'Chave TMDB_API_KEY não configurada no servidor (.env).'
      });
    }

    const now = Date.now();
    if (moviesCache.data && now - moviesCache.timestamp < CACHE_TTL_MS) {
      return res.json({
        cached: true,
        actor: 'Tom Hanks',
        total: moviesCache.data.length,
        movies: moviesCache.data
      });
    }

    // 1. Busca o ID do Tom Hanks no TMDB
    let personId = moviesCache.personId;
    if (!personId) {
      const searchUrl = `https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=Tom+Hanks&language=pt-BR`;
      const searchRes = await axios.get(searchUrl);

      if (!searchRes.data.results || searchRes.data.results.length === 0) {
        return res.status(404).json({ error: 'Ator Tom Hanks não encontrado na API do TMDB.' });
      }

      personId = searchRes.data.results[0].id;
      moviesCache.personId = personId;
    }

    // 2. Busca a filmografia (movie_credits) do Tom Hanks
    const creditsUrl = `https://api.themoviedb.org/3/person/${personId}/movie_credits?api_key=${apiKey}&language=pt-BR`;
    const creditsRes = await axios.get(creditsUrl);

    const cast = creditsRes.data.cast || [];

    // Filtra e formata os filmes
    // Remove duplicatas e filmes sem título
    const seenIds = new Set();
    const formattedMovies = [];

    for (const movie of cast) {
      if (!movie.id || seenIds.has(movie.id) || !movie.title) {
        continue;
      }
      seenIds.add(movie.id);

      formattedMovies.push({
        id: movie.id,
        title: movie.title,
        original_title: movie.original_title,
        overview: movie.overview || 'Sinopse não disponível em português.',
        poster_path: movie.poster_path,
        backdrop_path: movie.backdrop_path,
        poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
        backdrop_url: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : null,
        release_date: movie.release_date || '',
        release_year: movie.release_date ? movie.release_date.substring(0, 4) : 'N/A',
        vote_average: typeof movie.vote_average === 'number' ? Number(movie.vote_average.toFixed(1)) : 0,
        vote_count: movie.vote_count || 0,
        character: movie.character || 'Ele mesmo / Ator',
        popularity: movie.popularity || 0
      });
    }

    // Ordena primariamente por popularidade decrescente
    formattedMovies.sort((a, b) => b.popularity - a.popularity);

    moviesCache.data = formattedMovies;
    moviesCache.timestamp = now;

    return res.json({
      cached: false,
      actor: 'Tom Hanks',
      person_id: personId,
      total: formattedMovies.length,
      movies: formattedMovies
    });
  } catch (error) {
    console.error('[Movies Controller] Erro ao buscar filmes no TMDB:', error.message);
    return res.status(502).json({
      error: 'Falha ao consultar a API externa do TMDB. Verifique a chave TMDB_API_KEY ou conectividade.'
    });
  }
}

module.exports = {
  getTomHanksMovies
};
