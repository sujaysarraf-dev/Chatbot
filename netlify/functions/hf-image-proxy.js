exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { prompt, apiKey } = JSON.parse(event.body || "{}");

    if (!prompt || !apiKey) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Missing prompt or apiKey" }),
      };
    }

    console.log("Calling Hugging Face API for image generation");

    // Call Hugging Face Inference API
    // Use the standard inference API endpoint
    const response = await fetch(
      "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    console.log("Hugging Face response status:", response.status);

    if (!response.ok) {
      // If model is loading (503), return that status
      if (response.status === 503) {
        return {
          statusCode: 503,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({ error: "Model is loading, please try again in a few seconds" }),
        };
      }
      const errorText = await response.text();
      console.error("Hugging Face API error:", response.status, errorText);
      return {
        statusCode: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: errorText }),
      };
    }

    // Get the image blob
    const imageBlob = await response.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    console.log("Image generated successfully, size:", base64.length);

    // Return as base64 data URL
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({
        image: `data:image/png;base64,${base64}`,
      }),
    };
  } catch (error) {
    console.error("Serverless function error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ 
        error: error.message || "Internal server error",
        details: error.stack 
      }),
    };
  }
};

