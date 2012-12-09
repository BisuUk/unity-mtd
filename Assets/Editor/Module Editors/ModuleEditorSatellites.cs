using System;
using System.Collections;
using UnityEngine;
using UnityEditor;

using Nuaj;

namespace Nuaj.GUI
{
	/// <summary>
	/// Satellites editor
	/// </summary>
	public class ModuleEditorSatellites : ModuleEditorBase
	{
		#region CONSTANTS

		protected const float	DEFAULT_DISTANCE_MOON = 0.3f;
		protected const float	DEFAULT_DISTANCE_SUN = 185.0f;
		protected const float	DEFAULT_DISTANCE_BACKGROUND = 1000.0f;
		protected const int		BUTTON_SIZE = 32;

		#endregion

		#region FIELDS

		protected ModuleSatellites	m_Module = null;

		protected bool			m_bFoldOutRevolution = false;
		protected bool			m_bFoldOutLighting = false;

		#endregion

		#region PROPERTIES

		public override GUIContent TabCaption
		{
			get { return new GUIContent( "Satellites", "Edits the configuration for the satellites module" ); }
		}

		protected override string ModuleInfos
		{
			get { return	"Satellites Module\n" +
							"This module renders planetary satellites like the Moon, the Sun\n" +
							"but also the cosmological background of stars and galaxies.\n" +
							""; }
		}

		protected override string HelpURL
		{
			get { return "satellites-module"; }
		}

		#endregion

		#region METHODS

		public ModuleEditorSatellites( ModuleSatellites _Module ) : base( _Module )
		{
			m_Module = _Module;
		}

		public override bool	OnInspectorGUISimple()
		{
			if ( !base.OnInspectorGUISimple() )
				return false;

			return true;
		}

		public override bool	OnInspectorGUIAdvanced()
		{
			if ( !base.OnInspectorGUIAdvanced() )
				return false;

			using ( GUIHelpers.GUIEnabler( true ) )
			{
				//////////////////////////////////////////////////////////////////////////
				GUIHelpers.BeginHorizontal();

				GUIHelpers.IndentSpace();

				GUIHelpers.ShrinkableLabel( new GUIContent( "Add Satellites" ) );

				// Show the "Add Nearby Star" button
				if ( GUIHelpers.Button( new GUIContent( GUIHelpers.GetIcon( "Icons/SatelliteStar" ), "Adds a new nearby star satellite." ), GUILayout.Width( BUTTON_SIZE ), GUILayout.Height( BUTTON_SIZE ) ) )
					m_Module.SelectedSatellite = m_Module.AddSatellite( ModuleSatellites.SATELLITE_TYPE.NEARBY_STAR, null, DEFAULT_DISTANCE_SUN );		// Add a new satellite

				// Show the "Add Planetary Body" button
				if ( GUIHelpers.Button( new GUIContent( GUIHelpers.GetIcon( "Icons/SatellitePlanet" ), "Adds a new planetary body satellite." ), GUILayout.Width( BUTTON_SIZE ), GUILayout.Height( BUTTON_SIZE ) ) )
					m_Module.SelectedSatellite = m_Module.AddSatellite( ModuleSatellites.SATELLITE_TYPE.PLANETARY_BODY, null, DEFAULT_DISTANCE_MOON );	// Add a new satellite

				// Show the "Add Background" button
				if ( GUIHelpers.Button( new GUIContent( GUIHelpers.GetIcon( "Icons/SatelliteBackground" ), "Adds a new background satellite." ), GUILayout.Width( BUTTON_SIZE ), GUILayout.Height( BUTTON_SIZE ) ) )
					m_Module.SelectedSatellite = m_Module.AddSatellite( ModuleSatellites.SATELLITE_TYPE.BACKGROUND, null, DEFAULT_DISTANCE_BACKGROUND );		// Add a new satellite

				GUIHelpers.EndHorizontal();

				//////////////////////////////////////////////////////////////////////////
				// Display individual layers
				Nuaj.ModuleSatellites.SatelliteBase[]	Satellites = m_Module.Satellites;
				Nuaj.ModuleSatellites.SatelliteBase		SelectedSatellite = m_Module.SelectedSatellite;

				Color	DefaultColor = UnityEngine.GUI.backgroundColor;
				Color	NoSelectionColor = new Color( 1.3f * DefaultColor.r, 1.3f * DefaultColor.g, 1.3f * DefaultColor.b );
				Color	SelectionColor = new Color( NoSelectionColor.r + 0.5f, NoSelectionColor.g, NoSelectionColor.b );

				foreach ( Nuaj.ModuleSatellites.SatelliteBase S in Satellites )
				{
					// Change color based on selection
					UnityEngine.GUI.backgroundColor = S == SelectedSatellite ? SelectionColor : NoSelectionColor;

					Texture	Icon = null;
					if ( S is Nuaj.ModuleSatellites.SatellitePlanetaryBody )
						Icon = GUIHelpers.GetIcon( "Icons/SatellitePlanet" );
					else if ( S is Nuaj.ModuleSatellites.SatelliteStar )
						Icon = GUIHelpers.GetIcon( "Icons/SatelliteStar" );
					else if ( S is Nuaj.ModuleSatellites.SatelliteBackground )
						Icon = GUIHelpers.GetIcon( "Icons/SatelliteBackground" );

					GUIHelpers.BeginHorizontal();
					bool	bFoldOut = GUIHelpers.CustomFoldOut( S == SelectedSatellite, new GUIContent( S.Name, Icon ) );
					if ( GUILayout.Button( new GUIContent( GUIHelpers.GetIcon( "Icons/Reset" ), "Resets parameters for the satellite." ), GUIStyle.none, GUILayout.Width( 20 ) ) )
					{	// Reset that layer
						GUIHelpers.RegisterUndo( "Reset Satellite" );
						S.Reset();
					}
					if ( GUILayout.Button( new GUIContent( GUIHelpers.GetIcon( "Icons/Remove" ), "Removes the satellite." ), GUIStyle.none, GUILayout.Width( 24 ) ) )
					{	// Remove that satellite
						if ( GUIHelpers.MessageBox( "Are you sure you wish to remove the satellite ?", "Yes", "No" ) )
						{
							m_Module.RemoveSatellite( S );
							GUIHelpers.EnableHorizontalGroups = true;
							GUIHelpers.EndHorizontal();
							return true;
						}
					}
					GUIHelpers.EndHorizontal();

					if ( bFoldOut )
					{	// Display the content of our selected layer
						Indent();
						DisplaySatellite( S );
						SelectedSatellite = S;
						UnIndent();
					}
					else if ( S == SelectedSatellite )
						SelectedSatellite = null;	// The user closed the foldout, clearing the selection as well
				}

				// Update selection
				m_Module.SelectedSatellite = SelectedSatellite;

				// Restore color state
				UnityEngine.GUI.backgroundColor = DefaultColor;
			}

			return true;
		}

		#region Satellites GUI

		protected void	DisplaySatellite( Nuaj.ModuleSatellites.SatelliteBase _Satellite )
		{
			_Satellite.Enabled = GUIHelpers.CheckBox( new GUIContent( "Enabled", "Enables or disables satellite display." ), _Satellite.Enabled, (_Satellite.Enabled ? "Disable" : "Enable") + " Satellite" );

			using ( GUIHelpers.GUIEnabler( _Satellite.Enabled  ) )
			{
				//////////////////////////////////////////////////////////////////////////
				// Show generic parameters
				_Satellite.Name = GUIHelpers.TextBox( new GUIContent( "Name", "Sets the satellite's name." ), _Satellite.Name, "Change Satellite Name" );
				_Satellite.DistanceFromPlanetMKm = GUIHelpers.FloatBox( new GUIContent( "Distance", "Sets the satellite's distance from the planet, in MILLIONS of kilometers." ), _Satellite.DistanceFromPlanetMKm, "Change Satellite Distance" );
				_Satellite.TiltAngle = Mathf.Deg2Rad * GUIHelpers.Slider( new GUIContent( "Tilt Angle", "Sets the satellite's tilt angle.\nThis allows to make the satellites rotate about their axis." ), Mathf.Rad2Deg * _Satellite.TiltAngle, -180.0f, 180.0f, "Change Satellite Tilt Angle" );

				if ( GUIHelpers.FoldOut( ref m_bFoldOutRevolution, "Revolution Plane" ) )
				{
					Indent();
					_Satellite.RotationAxis = GUIHelpers.Vector3Box( new GUIContent( "Revolution Axis", "Specifies the axis about which the satellite will revolve." ), _Satellite.RotationAxis, "Change Rotation Axis" );
					_Satellite.RevolutionAngle = Mathf.Deg2Rad * GUIHelpers.FloatBox( new GUIContent( "Revolution Angle", "Sets the revolution angle in degrees.\nThis is the rotation angle of the satellite about its axis" ), Mathf.Rad2Deg * _Satellite.RevolutionAngle, "Change Revolution Angle" );
					_Satellite.RevolutionPeriod = GUIHelpers.FloatBox( new GUIContent( "Revolution Period", "Sets the revolution period in seconds.\nThis is the time it take for the satellite to perform a full revolution about the planet." ), _Satellite.RevolutionPeriod, "Change Revolution Period" );
					_Satellite.RevolutionTime = GUIHelpers.FloatBox( new GUIContent( "Revolution Time", "Sets the revolution time in seconds.\nThis parameter transforms into the Revolution Angle using the Revolution Period : setting the time to the revolution period translates into a revolution angle of 360°." ), _Satellite.RevolutionTime, "Change Revolution Time" );
					_Satellite.SimulateCycle = GUIHelpers.CheckBox( new GUIContent( "Simulate Cycle", "If true, the satellite will update its position automatically with time, using the specified Revolution Period to complete a full cycle." ), _Satellite.SimulateCycle, "Change Animate Satellite" );
					UnIndent();
				}

 				GUIHelpers.Separate();

				//////////////////////////////////////////////////////////////////////////
				// Show specific parameters
				if ( _Satellite is Nuaj.ModuleSatellites.SatellitePlanetaryBody )
					DisplaySatellite( _Satellite as Nuaj.ModuleSatellites.SatellitePlanetaryBody );
				else if ( _Satellite is Nuaj.ModuleSatellites.SatelliteStar )
					DisplaySatellite( _Satellite as Nuaj.ModuleSatellites.SatelliteStar );
				else if ( _Satellite is Nuaj.ModuleSatellites.SatelliteBackground )
					DisplaySatellite( _Satellite as Nuaj.ModuleSatellites.SatelliteBackground );

				GUIHelpers.Separate();
			}
		}

 		protected void	DisplaySatellite( Nuaj.ModuleSatellites.SatellitePlanetaryBody _Satellite )
		{
			_Satellite.Luminance = GUIHelpers.Slider( new GUIContent( "Luminance", "Sets the satellite's luminance.\nBe careful the luminance should be very inferior to the Sun's intensity (like 100 times lower) otherwise your satellites will start to show during the day.\nIn the case where the satellite is lit without using the \"UseSunLuminance\" option, the luminance can be set to levels about the same as the Sun's luminance" ), _Satellite.Luminance, 0.0f, !_Satellite.UseSunLuminance ? 10.0f : 1.0f, "Change Satellite Luminance" );
			_Satellite.Albedo = GUIHelpers.ColorBox( new GUIContent( "Albedo", "Sets the albedo and transparency of the satellite.\nThe albedo is the reflection coefficient of a surface. For example, the average albedo of the Moon is 0.12" ), _Satellite.Albedo, "Change Albedo" );
			GUIHelpers.Separate();
			_Satellite.TextureDiffuse = GUIHelpers.SelectTexture( new GUIContent( "Diffuse", "Sets the diffuse texture used for the satellite." ), _Satellite.TextureDiffuse, "Change Satellite Diffuse" );
			_Satellite.DisplaySize = GUIHelpers.Slider( new GUIContent( "Display Size", "Sets the screen size of the satellite in pixels." ), _Satellite.DisplaySize, 0.0f, 1000.0f, "Change Display Size" );
			_Satellite.AspectRatio = GUIHelpers.Slider( new GUIContent( "Aspect Ratio", "Sets the aspect ratio of the satellite." ), _Satellite.AspectRatio, 0.0f, 4.0f, "Change Aspect Ratio" );
			_Satellite.TopLeftCorner = GUIHelpers.Vector2Box( new GUIContent( "Top Left Corner", "Sets the top-left mapping coordinate to crop the satellite texture." ), _Satellite.TopLeftCorner, "Change Top Left Corner" );
			_Satellite.Size = GUIHelpers.Vector2Box( new GUIContent( "Width / Height", "Sets the width and height mapping coordinate to crop the satellite texture." ), _Satellite.Size, "Change Width Height" );

			// Lighting
			if ( GUIHelpers.FoldOut( ref m_bFoldOutLighting, "Lighting Simulation" ) )
			{
				Indent();
				using ( GUIHelpers.GUIEnabler( _Satellite.SimulateLighting = GUIHelpers.CheckBox( new GUIContent( "Enable Lighting", "Enables or disables the lighting of the satellite.\nIf your satellite image is a disc, like the picture of the moon, then Nuaj' can simulate a fake lighting as if the satellite was an actual celestial sphere." ), _Satellite.SimulateLighting, (_Satellite.SimulateLighting ? "Disable" : "Enable") + " Satellite Lighting" ) ) )
				{
					_Satellite.UseSunLuminance = GUIHelpers.CheckBox( new GUIContent( "Use Sun Luminance", "Tells if the satellite should be lit with Sun's luminance." ), _Satellite.UseSunLuminance, "Change Use Sun Luminance" );
					_Satellite.SurfaceRoughness = GUIHelpers.Slider( new GUIContent( "Surface Roughness", "Sets the roughness of the surface of the satellite.\nA roughness of 0 will make the satellite appear smooth while a smoothness of 1 is ideal for dusty satellites like the Moon." ), _Satellite.SurfaceRoughness, 0.0f, 1.0f, "Change Surface Roughness" );
					_Satellite.TextureNormal = GUIHelpers.SelectTexture( new GUIContent( "Normal", "Sets the normal texture used for the satellite lighting.\nThis is optional !" ), _Satellite.TextureNormal, "Change Satellite Normal" );
				}
				UnIndent();
			}
		}

 		protected void	DisplaySatellite( Nuaj.ModuleSatellites.SatelliteStar _Satellite )
		{
			_Satellite.Luminance = GUIHelpers.Slider( new GUIContent( "Luminance", "Sets the satellite's luminance.\nBe careful the luminance should be very inferior to the Sun's intensity (like 100 times lower) otherwise your satellites will start to show during the day." ), _Satellite.Luminance, 0.0f, 10.0f, "Change Satellite Luminance" );
			GUIHelpers.Separate();
			_Satellite.TextureEmissive = GUIHelpers.SelectTexture( new GUIContent( "Emissive", "Sets the emissive texture used for the satellite." ), _Satellite.TextureEmissive, "Change Satellite Emissive" );
			_Satellite.DisplaySize = GUIHelpers.Slider( new GUIContent( "Display Size", "Sets the screen size of the satellite in pixels." ), _Satellite.DisplaySize, 0.0f, 1000.0f, "Change Display Size" );
			_Satellite.AspectRatio = GUIHelpers.Slider( new GUIContent( "Aspect Ratio", "Sets the aspect ratio of the satellite." ), _Satellite.AspectRatio, 0.0f, 4.0f, "Change Aspect Ratio" );
			_Satellite.TopLeftCorner = GUIHelpers.Vector2Box( new GUIContent( "Top Left Corner", "Sets the top-left mapping coordinate to crop the satellite texture." ), _Satellite.TopLeftCorner, "Change Top Left Corner" );
			_Satellite.Size = GUIHelpers.Vector2Box( new GUIContent( "Width / Height", "Sets the width and height mapping coordinate to crop the satellite texture." ), _Satellite.Size, "Change Width Height" );

			GUIHelpers.Separate();
			_Satellite.SunDrivesSatellite = GUIHelpers.CheckBox( new GUIContent( "Sun Drives Satellite", "Tells if the satellite's position should be dicated by the Sun./nUse this to make the satellite follow the Sun." ), _Satellite.SunDrivesSatellite, "Change Sun Drives Satellite" );
			_Satellite.SatelliteDrivesSun = GUIHelpers.CheckBox( new GUIContent( "Satellite Drives Sun", "Tells if the Sun's position should be dictated by the satellite./nUse this to make the Sun follow the satellite. If you combine this option with the \"Simulate Cycle\" option then your Sun will emulate a regular and realistic circadian cycle." ), _Satellite.SatelliteDrivesSun, "Change Satellite Drives Sun" );
			_Satellite.UseSunLuminance = GUIHelpers.CheckBox( new GUIContent( "Use Sun Luminance", "Tells if the satellite should have the same luminance as the Sun./nUseful if you wish to represent the physical Sun using a satellite." ), _Satellite.UseSunLuminance, "Change Use Sun Luminance" );
		}

 		protected void	DisplaySatellite( Nuaj.ModuleSatellites.SatelliteBackground _Satellite )
		{
			_Satellite.Luminance = GUIHelpers.Slider( new GUIContent( "Luminance", "Sets the satellite's luminance.\nBe careful the luminance should be very inferior to the Sun's intensity (like 100 times lower) otherwise your satellites will start to show during the day." ), _Satellite.Luminance, 0.0f, 2.0f, "Change Satellite Luminance" );
			GUIHelpers.Separate();
			_Satellite.TextureEmissive = GUIHelpers.SelectCubeMap( new GUIContent( "Emissive", "Sets the emissive texture used for the satellite." ), _Satellite.TextureEmissive, "Change Satellite Emissive" );
			_Satellite.FlipCubeMapY = GUIHelpers.CheckBox( new GUIContent( "Flip Cube Map", "Enables cube map vertical flip." ), _Satellite.FlipCubeMapY, "Change Cube Map Flip" );
			_Satellite.Brightness = GUIHelpers.Slider( new GUIContent( "Brightness", "Sets the texture brightness." ), _Satellite.Brightness, -1.0f, 1.0f, "Change Brightness" );
			_Satellite.Contrast = GUIHelpers.Slider( new GUIContent( "Contrast", "Sets the texture contrast." ), _Satellite.Contrast, -1.0f, 1.0f, "Change Contrast" );
			_Satellite.Gamma = GUIHelpers.Slider( new GUIContent( "Gamma", "Sets the texture gamma correction." ), _Satellite.Gamma, 0.0f, 10.0f, "Change Gamma" );
			_Satellite.Ambient = GUIHelpers.ColorBox( new GUIContent( "Ambient", "Sets an additional ambient color to add to the image.\nThis helps you to add a small, regular blue tint at night for example" ), _Satellite.Ambient, "Change Ambient" );
		}

		#endregion

		#endregion
	}
}