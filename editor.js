import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";
import dotenv from "dotenv";
dotenv.config();

const groq = process.env.GROQ_API;
console.log(groq);

document.addEventListener("DOMContentLoaded", function () {
  const editor = new EditorJS({
    holder: "editorjs",
    tools: {
      header: Header,
      image: SimpleImage,
      list: List,
      paragraph: Paragraph,
      delimiter: Delimiter,
    },
    onChange: debounce(() => {
      editor
        .save()
        .then((outputData) => {
          nicenText(outputData);
          renderOutput(outputData);
        })
        .catch((error) => {
          console.log("Saving failed: ", error);
        });
    }, 2000),
  });

  function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        func.apply(this, args);
      }, timeout);
    };
  }

  function nicenText(data) {
    let systemText = `You are a helper, your job is to proofread text and enhance it without adding or modifying the core information, using clean Markdown formatting, not doing any notes or additional pieces of information,`;
    systemText +=
      "you put loose words into sentences and format them nicely in markdown format, decide on your own what could be a header or what could be put into a bullet list and so on,";
    systemText +=
      "you are not allowed to make up or invent new things or pieces of information,";
    systemText += "you are not allowed to tell anything about yourself,";
    systemText +=
      "You do not give any answers, notes, textual help, description of what you did or any response, you just work with the information given to you after this:";

    const textBlocks = data.blocks.map((block) => block.data.text).join("\n\n");

    fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `"Bearer" + ${groq}`, // Securely manage the API key
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: systemText + textBlocks }],
        model: "llama3-8b-8192",
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.choices && data.choices[0] && data.choices[0].message) {
          document.getElementById("output-content").innerHTML = marked(
            data.choices[0].message.content
          );
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }

  function renderOutput(data) {
    const outputContent = document.getElementById("output-content");
    const markdown = data.blocks
      .map((block) => {
        switch (block.type) {
          case "header":
            return `## ${block.data.text}`;
          case "paragraph":
            return block.data.text;
          case "list":
            const items = block.data.items
              .map((item) => `- ${item}`)
              .join("\n");
            return items;
          case "delimiter":
            return "---";
          default:
            return "";
        }
      })
      .join("\n\n");
    outputContent.innerHTML = marked(markdown);
  }
});
