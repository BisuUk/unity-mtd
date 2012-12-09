using System;
using System.Collections.Generic;
using UnityEngine;

namespace Nuaj
{
	/// <summary>
	/// This is the base module that can display layered elements
	/// </summary>
	[Serializable]
	public abstract class ModuleCloudLayerBase : ModuleBase
	{
		#region NESTED TYPES

		/// <summary>
		/// Describes a single cloud layer
		/// </summary>
		[Serializable]
		public abstract class	CloudLayerBase : ICloudLayer
		{
			#region FIELDS

			/////////////////////////////////////////////////////////
			// Parameters

			// Rendering parameters
			[SerializeField] protected bool		m_bEnabled = true;
			[SerializeField] protected bool		m_bCastShadow = true;

			// Appearance parameters
			[SerializeField] protected float	m_AltitudeKm = 4.0f;
			[SerializeField] protected float	m_ThicknessKm = 0.2f;


			/////////////////////////////////////////////////////////
			// Textures & Targets
			protected RenderTexture				m_RTScattering = null;
			protected RenderTexture				m_RTEnvMapSky = null;
			protected RenderTexture				m_RTEnvMapSun = null;

			#endregion

			#region PROPERTIES

			#region ICloudLayer Members

			/// <summary>
			/// Gets or sets the enabled state of the layer (a disabled layer is obviously not rendered)
			/// </summary>
			public bool				Enabled					{ get { return m_bEnabled; } set { m_bEnabled = value; } }

			/// <summary>
			/// Gets the bypass state of the layer
			/// Some layers can set their Bypass flag internally if they know they will render nothing.
			/// </summary>
			public virtual bool		Bypass					{ get { return false; } }

			/// <summary>
			/// Gets or sets the altitude of the cloud layer (in kilometers)
			/// </summary>
			public float			Altitude				{ get { return m_AltitudeKm; } set { m_AltitudeKm = value; } }

			/// <summary>
			/// Gets or sets the thickness of the cloud layer (in kilometers)
			/// </summary>
			public float			Thickness				{ get { return m_ThicknessKm; } set { m_ThicknessKm = value; } }

			/// <summary>
			/// (internal) Tells if the layer is volumetric or not
			/// </summary>
			public abstract bool	IsVolumetric			{ get; }

			/// <summary>
			/// Gets or sets the cast shadow flag that enables a layer to cast shadow to the world below it
			/// </summary>
			public bool				CastShadow				{ get { return m_bCastShadow; } set { m_bCastShadow = value; } }

			/// <summary>
			/// Gets the render target the layer renders to
			/// </summary>
			public RenderTexture	RenderTarget			{ get { return m_RTScattering; } }

			/// <summary>
			/// Gets the small environment render target the layer renders the Sky to
			/// </summary>
			public RenderTexture	EnvironmentRenderTargetSky	{ get { return m_RTEnvMapSky; } }

			/// <summary>
			/// Gets the 1x1 environment render target the layer renders the Sun to
			/// </summary>
			public RenderTexture	EnvironmentRenderTargetSun	{ get { return m_RTEnvMapSun; } }

			#endregion

			#endregion

			#region METHODS

			public	CloudLayerBase()
			{
			}

			#region IMonoBehaviour Members

			public virtual void OnDestroy()
			{
				DestroyRenderTargets();
			}

			public virtual void Awake()
			{
			}

			public virtual void Start()
			{
			}

			public virtual void OnEnable()
			{
			}

			public virtual void OnDisable()
			{
			}

			public virtual void Update()
			{
			}

			#endregion

			#region ICloudLayer Members

			public abstract void	Render( int _LayerIndex, RenderTexture _ShadowMap, RenderTexture _ShadowEnvMapSky, RenderTexture _ShadowEnvMapSun, bool _bRenderEnvironment );

			#endregion

			/// <summary>
			/// Resets the layer to its default values
			/// </summary>
			public virtual void		Reset()
			{
				CastShadow = true;
			}

			internal abstract void	CreateRenderTargets( int _Width, int _Height );

			internal abstract void	DestroyRenderTargets();

			protected virtual void	UpdateCachedValues()
			{
			}

			/// <summary>
			/// Called whenever the manager's upscale technique changed
			/// </summary>
			/// <param name="_Technique"></param>
			internal virtual void	UpScaleTechniqueChanged( NuajManager.UPSCALE_TECHNIQUE _Technique )
			{
			}

			/// <summary>
			/// Creates the sky and sun environment maps for the layer
			/// </summary>
			/// <returns></returns>
			protected void	CreateEnvMaps( string _Name )
			{
				m_RTEnvMapSky = Help.CreateRT( _Name, 2 << NuajManager.ENVIRONMENT_TEXTURE_SIZE_POT, 1 << NuajManager.ENVIRONMENT_TEXTURE_SIZE_POT, RenderTextureFormat.ARGBHalf, FilterMode.Point, TextureWrapMode.Clamp );
				m_RTEnvMapSun = Help.CreateRT( _Name, 1, 1, RenderTextureFormat.ARGBHalf, FilterMode.Point, TextureWrapMode.Clamp );
			}

			#endregion
		}

		#endregion

		#region FIELDS

		/////////////////////////////////////////////////////////
		// Internal data
		protected int					m_Width = 0;
		protected int					m_Height = 0;

		#endregion

		#region PROPERTIES

		/// <summary>
		/// Gets the list of existing clouds layers
		/// </summary>
		public abstract ICloudLayer[]	CloudLayers		{ get; }

		/// <summary>
		/// Occurs when the list of layers changed
		/// </summary>
		public event EventHandler	LayersChanged;

		#endregion

		#region METHODS

		internal	ModuleCloudLayerBase( string _Name ) : base( _Name )
		{
		}

		internal override void UpScaleTechniqueChanged( NuajManager.UPSCALE_TECHNIQUE _Technique )
		{
			base.UpScaleTechniqueChanged( _Technique );

			// Forward to layers
			foreach ( CloudLayerBase Layer in CloudLayers )
				Layer.UpScaleTechniqueChanged( _Technique );
		}

		protected void	NotifyLayersChanged()
		{
			// Notify
			if ( LayersChanged != null )
				LayersChanged( this, EventArgs.Empty );
		}

		#endregion
	}
}