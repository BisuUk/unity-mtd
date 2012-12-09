using System;
using System.Collections;
using UnityEngine;

namespace Nuaj
{
	/// <summary>
	/// Base interface for cloud layers
	/// </summary>
	public interface ICloudLayer : IMonoBehaviour
	{
		/// <summary>
		/// Gets or sets the enabled state of the layer (a disabled layer is obviously not rendered).
		/// IMPORTANT NOTE : You can only have up to 4 active layers at the same time !
		/// </summary>
		bool			Enabled				{ get; set; }

		/// <summary>
		/// Gets the bypass state of the layer.
		/// Some layers can set their Bypass flag internally if they know they will render nothing (that's the case when a layer's density is 0 for example).
		/// </summary>
		bool			Bypass				{ get; }

		/// <summary>
		/// Gets or sets the altitude of the cloud layer (in kilometers)
		/// </summary>
		float			Altitude			{ get; set; }

		/// <summary>
		/// Gets or sets the thickness of the cloud layer (in kilometers)
		/// </summary>
		float			Thickness			{ get; set; }

		/// <summary>
		/// (internal) Tells if the layer is volumetric or not
		/// </summary>
		bool			IsVolumetric		{ get; }

		/// <summary>
		/// Gets or sets the cast shadow flag that enables a layer to cast shadow to the world below it
		/// </summary>
		bool			CastShadow			{ get; set; }

		/// <summary>
		/// Gets the render target the layer renders to
		/// </summary>
		/// <remarks>You will find the layer's in-scattered light in RGB and extinction in Alpha</remarks>
		RenderTexture	RenderTarget		{ get; }

		/// <summary>
		/// Gets the small environment render target the layer renders the Sky to
		/// </summary>
		/// <remarks>You will find the layer's environment in-scattered light in RGB and extinction in Alpha</remarks>
		RenderTexture	EnvironmentRenderTargetSky	{ get; }

		/// <summary>
		/// Gets the 1x1 environment render target the layer renders the Sun to
		/// </summary>
		/// <remarks>You will find the layer's environment in-scattered light in RGB and extinction in Alpha</remarks>
		RenderTexture	EnvironmentRenderTargetSun	{ get; }

		/// <summary>
		/// Renders the layer, its environment map and its shadow
		/// </summary>
		/// <param name="_LayerIndex">The index of the layer (helps to determine which channel of the shadow map should be modified)</param>
		/// <param name="_ShadowMap">The shadow map to render to</param>
		/// <param name="_ShadowEnvMapSky">The shadow env map to use for ambient Sky term shadowing</param>
		/// <param name="_ShadowEnvMapSun">The shadow env map to use for ambient Sun term shadowing</param>
		/// <param name="_bRenderEnvironment">True to render the environment map</param>
		void			Render( int _LayerIndex, RenderTexture _ShadowMap, RenderTexture _ShadowEnvMapSky, RenderTexture _ShadowEnvMapSun, bool _bRenderEnvironment );
	}
}