import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 8888;

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

app.get("/login", (req, res) => {
  const scopes = "user-library-read";
  const authURL = `https://accounts.spotify.com/authorize?client_id=${client_id}&response_type=code&redirect_uri=${encodeURIComponent(
    redirect_uri
  )}&scope=${encodeURIComponent(scopes)}`;

  res.redirect(authURL);
});

app.get("/callback", async (req, res) => {
  const code = req.query.code;

  try {
    const tokenResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirect_uri,
      }),
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${client_id}:${client_secret}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const access_token = tokenResponse.data.access_token;
    const refresh_token = tokenResponse.data.refresh_token;

    let allTracks = [];
    let offset = 0;
    let limit = 50;

    while (true) {
      const tracksResponse = await axios.get(
        `https://api.spotify.com/v1/me/tracks?limit=${limit}&offset=${offset}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      const items = tracksResponse.data.items;
      allTracks.push(...items);

      if (items.length < limit) break;
      offset += limit;
    }

    res.send({
      total: allTracks.length,
      tracks: allTracks.map((t) => ({
        name: t.track.name,
        artist: t.track.artists.map((a) => a.name).join(", "),
        id: t.track.id,
      })),
    });
  } catch (err) {
    console.error(err);
    res.send("Error retrieving tokens or tracks.");
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
