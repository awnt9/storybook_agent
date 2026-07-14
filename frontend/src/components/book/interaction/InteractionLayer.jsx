import { ImagePlus } from "lucide-react";
import { useEffect, useState } from "react";

export function YesNoInput({ component, value, onChange, disabled }) {
  return (
    <div className="book-interaction-yesno" role="group" aria-label={component.label}>
      <p className="book-interaction-label">{component.label}</p>
      <div className="book-interaction-yesno-buttons">
        <button
          className={`book-interaction-btn${value === "yes" ? " book-interaction-btn--active" : ""}`}
          disabled={disabled}
          onClick={() => onChange("yes")}
          type="button"
        >
          {component.yes_label || "Sí"}
        </button>
        <button
          className={`book-interaction-btn${value === "no" ? " book-interaction-btn--active" : ""}`}
          disabled={disabled}
          onClick={() => onChange("no")}
          type="button"
        >
          {component.no_label || "No"}
        </button>
      </div>
    </div>
  );
}

export function TextInputField({ component, value, onChange, disabled }) {
  return (
    <label className="book-interaction-text">
      <span className="book-interaction-label">{component.label}</span>
      <textarea
        className="book-interaction-textarea"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={component.placeholder || "Escribe aquí..."}
        rows={3}
        value={value || ""}
      />
    </label>
  );
}

export function SingleChoiceInput({ component, value, onChange, disabled }) {
  const options = component.options || [];

  return (
    <fieldset className="book-interaction-choice" disabled={disabled}>
      <legend className="book-interaction-label">{component.label}</legend>
      <div className="book-interaction-choice-options">
        {options.map((option) => (
          <button
            key={option}
            className={`book-interaction-btn book-interaction-choice-btn${
              value === option ? " book-interaction-btn--active" : ""
            }`}
            disabled={disabled}
            onClick={() => onChange(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function ImageInputField({ component, value, onChange, disabled }) {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let localPreviewUrl = null;

    if (!value) {
      setPreviewUrl(null);
      return undefined;
    }

    if (typeof value === "string") {
      if (value.startsWith("blob:")) {
        setPreviewUrl(value);
        return undefined;
      }

      const accessToken = localStorage.getItem("access_token");
      fetch(value, {
        credentials: "include",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("No se pudo cargar la imagen");
          const blob = await response.blob();
          if (!isMounted) return;
          localPreviewUrl = URL.createObjectURL(blob);
          setPreviewUrl(localPreviewUrl);
        })
        .catch((error) => {
          console.error(error);
          if (isMounted) setPreviewUrl(null);
        });

      return () => {
        isMounted = false;
        if (localPreviewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(localPreviewUrl);
        }
      };
    }

    if (value instanceof File) {
      localPreviewUrl = URL.createObjectURL(value);
      setPreviewUrl(localPreviewUrl);
      return () => {
        URL.revokeObjectURL(localPreviewUrl);
      };
    }

    setPreviewUrl(null);
    return undefined;
  }, [value]);

  const loadPhoto = (photo) => {
    if (!photo?.type.startsWith("image/")) return;
    onChange(photo);
  };

  return (
    <div className="book-interaction-image">
      <p className="book-interaction-label">{component.label}</p>
      <label className={`book-interaction-image-drop${disabled ? " book-interaction-image-drop--disabled" : ""}`}>
        <input
          accept="image/*"
          disabled={disabled}
          onChange={(event) => {
            loadPhoto(event.target.files[0]);
            event.target.value = "";
          }}
          type="file"
        />
        {previewUrl ? (
          <img alt="Imagen seleccionada" src={previewUrl} />
        ) : (
          <span className="book-interaction-image-placeholder">
            <ImagePlus aria-hidden="true" />
            <small>Sube una imagen</small>
          </span>
        )}
      </label>
    </div>
  );
}

const INTERACTION_RENDERERS = {
  yes_no: YesNoInput,
  text_input: TextInputField,
  single_choice: SingleChoiceInput,
  image_input: ImageInputField,
};

export function InteractionLayer({ component, value, onChange, disabled = false }) {
  if (!component) return null;

  const Renderer = INTERACTION_RENDERERS[component.type];
  if (!Renderer) return null;

  return (
    <div className="book-interaction-layer">
      <Renderer
        component={component}
        disabled={disabled}
        onChange={onChange}
        value={value}
      />
    </div>
  );
}

export function isInteractionComplete(component, value) {
  if (!component) return true;

  switch (component.type) {
    case "yes_no":
      return value === "yes" || value === "no";
    case "text_input":
      return typeof value === "string" && value.trim().length > 0;
    case "single_choice":
      return typeof value === "string" && value.length > 0;
    case "image_input":
      return value instanceof File || (typeof value === "string" && value.length > 0);
    default:
      return false;
  }
}

export function buildUserActionFromResponse(component, value) {
  if (!component) {
    return { action_type: "advance" };
  }

  switch (component.type) {
    case "yes_no":
      return {
        action_type: "yes_no",
        component_id: component.id,
        text: value,
      };
    case "text_input":
      return {
        action_type: "text_input",
        component_id: component.id,
        text: value.trim(),
      };
    case "single_choice":
      return {
        action_type: "single_choice",
        component_id: component.id,
        text: value,
      };
    case "image_input":
      return {
        action_type: "image_input",
        component_id: component.id,
      };
    default:
      return { action_type: "advance" };
  }
}
