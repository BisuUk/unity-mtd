using System;
using System.Collections;
using UnityEngine;
using UnityEditor;

using Nuaj;
using Nuaj.GUI;

[CustomEditor( typeof(NuajOrchestrator) )]
public class OrchestratorEditor : Editor
{
	#region FIELDS

	protected bool	m_bFoldOutDate = false;
	protected bool	m_bFoldOutLocation = false;

	#endregion

	#region METHODS

	public override void	OnInspectorGUI()
	{
		NuajOrchestrator	T = target as NuajOrchestrator;
		if ( T == null )
		{	// Invalid manager !
			Debug.LogError( "Invalid NuajOrchestratorDayNightCycle to inspect in GUI !" );
			return;
		}

		// Setup the current UNDO target
		GUIHelpers.ms_UNDOObject = T;

		//////////////////////////////////////////////////////////////////////////
		// TIME & DATE
		//////////////////////////////////////////////////////////////////////////
		//
		GUIHelpers.BoldLabel( new GUIContent( "Time, Date & Location", "" ) );
		EditorGUI.indentLevel++;
		T.TimeOfDay = GUIHelpers.Slider( new GUIContent( "Time of Day", "Sets the time of day" ), T.TimeOfDay, 0.0f, 24.0f, "Change Time of Day" );
		T.DensityMultiplierAtNight = GUIHelpers.Slider( new GUIContent( "Night Density Factor", "Sets the density factor to use when the Sun sets.\nThis helps to create stunning sunsets." ), T.DensityMultiplierAtNight, 1.0f, 10.0f, "Change Density Factor" );

		if ( GUIHelpers.FoldOut( ref m_bFoldOutDate, "Date" ) )
		{
			EditorGUI.indentLevel++;

			T.Day = GUIHelpers.SliderInt( new GUIContent( "Day", "Sets the day of the month [1,31]" ), T.Day, 1, 31, "Change Day of Month" );
			T.Month = GUIHelpers.SliderInt( new GUIContent( "Month", "Sets the month of the year [1,12]" ), T.Month, 1, 12, "Change Month of Year" );
			T.DayOfYear = GUIHelpers.SliderInt( new GUIContent( "Day of Year", "Sets the Julian day in [0,365]" ), T.DayOfYear, 0, 365, "Change Day of Year" );

			EditorGUI.indentLevel--;
			GUIHelpers.Separate();
		}

		if ( GUIHelpers.FoldOut( ref m_bFoldOutLocation, "Location" ) )
		{
			EditorGUI.indentLevel++;

			T.Latitude = GUIHelpers.Slider( new GUIContent( "Latitude", "Sets the latitude from -90° (south pole) to +90° (north pole)." ), T.Latitude, -90.0f, 90.0f, "Change Latitude" );
			T.Longitude = GUIHelpers.Slider( new GUIContent( "Longitude", "Sets the longitude from -180° to +180°." ), T.Longitude, -180.0f, 180.0f, "Change Longitude" );

			EditorGUI.indentLevel--;
			GUIHelpers.Separate();
		}
		GUIHelpers.Separate();
		EditorGUI.indentLevel--;

		//////////////////////////////////////////////////////////////////////////
		// WEATHER CHANGE
		//////////////////////////////////////////////////////////////////////////
		//
		GUIHelpers.BoldLabel( new GUIContent( "Weather Control", "" ) );
		EditorGUI.indentLevel++;
		GUIHelpers.BeginHorizontal();
		GUIHelpers.EnableHorizontalGroups = false;
		T.WeatherTypeSource = (NuajOrchestrator.WEATHER_PRESETS) GUIHelpers.ComboBox( new GUIContent( "Source Preset", "Sets source weather preset to interpolate." ), T.WeatherTypeSource, "Change Source Weather Type" );
		T.WeatherTypeTarget = (NuajOrchestrator.WEATHER_PRESETS) GUIHelpers.ComboBox( new GUIContent( "Target Preset", "Sets target weather preset to interpolate." ), T.WeatherTypeTarget, "Change Target Weather Type" );
		GUIHelpers.EnableHorizontalGroups = true;
		GUIHelpers.EndHorizontal();
		T.WeatherBalance = GUIHelpers.Slider( new GUIContent( "Weather Balance", "Sets the weather balance from 0 (Source Preset) to 1 (Target Preset)" ), T.WeatherBalance, 0.0f, 1.0f, "Change Weather Balance" );
		GUIHelpers.Separate();

		T.WindForce = GUIHelpers.Slider( new GUIContent( "Wind Force", "Sets the global force of the wind." ), T.WindForce, 0.0f, 0.5f, "Change Wind Force" );
		T.WindDirectionAngle = Mathf.Deg2Rad * GUIHelpers.Slider( new GUIContent( "Wind Direction", "Sets the global direction of the wind." ), Mathf.Rad2Deg * T.WindDirectionAngle, -180.0f, 180.0f, "Change Wind Direction" );
		EditorGUI.indentLevel--;

		if ( GUI.changed )
 			EditorUtility.SetDirty( T );
	}

	#endregion
}
