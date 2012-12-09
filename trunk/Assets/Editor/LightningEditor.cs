using System;
using System.Collections;
using UnityEngine;
using UnityEditor;

using Nuaj;
using Nuaj.GUI;

/// <summary>
/// This is the editor for Nuaj' lightning bolts
/// </summary>
[CustomEditor( typeof(NuajLightningBolt) )]
public class LightningEditor : Editor
{
	#region METHODS

	public override void	OnInspectorGUI()
	{
		NuajLightningBolt	T = target as NuajLightningBolt;
		if ( T == null )
		{	// Invalid manager !
			Debug.LogError( "Invalid LightningBolt to inspect in GUI !" );
			return;
		}

		// Setup the current UNDO target
		GUIHelpers.ms_UNDOObject = T;

		T.P0 = GUIHelpers.Vector3Box( new GUIContent( "Starting Point", "Defines the start position of the lightning bolt (in local space)" ), T.P0, "Change Lightning Start" );
		DisplayAltitude( T.transform.position + T.P0 );
		GUIHelpers.Separate();
		T.P1 = GUIHelpers.Vector3Box( new GUIContent( "End Point", "Defines the end position of the lightning bolt (in local space)" ), T.P1, "Change Lightning End" );
		DisplayAltitude( T.transform.position + T.P1 );
		DisplayLength( T );
		GUIHelpers.Separate();

		T.Color = GUIHelpers.ColorBox( new GUIContent( "Color", "Changes the color of the lighning" ), T.Color, "Change Lightning Color" );
		T.Intensity = GUIHelpers.Slider( new GUIContent( "Intensity", "Changes the intensity of the lighning" ), T.Intensity, 0.0f, 50.0f, "Change Lightning Intensity" );

		GUIHelpers.Separate();
		T.PointLightIntensityFactor = GUIHelpers.Slider( new GUIContent( "Point Light Factor", "Changes the intensity factor applied to the child point light" ), T.PointLightIntensityFactor, 0.0f, 1.0f, "Change Point Light Factor" );

		GUIHelpers.Separate( 20 );
		T.GizmoCubeSize = GUIHelpers.Slider( new GUIContent( "Gizmo Cube Size", "Changes the size of the gizmo.\nPurely GUI, has NO EFFECT on the lightning whatsoever" ), T.GizmoCubeSize, 0.0f, 10.0f, "Change Gizmo Cube Size" );

		// Start & Update lightning strike
		if ( GUIHelpers.Button( new GUIContent( "STRIKE !" ) ) )
			T.StartStrike( 100.0f, 2.0f, 10.0f );
		T.UpdateStrike();

		if ( GUI.changed )
 			EditorUtility.SetDirty( T );
	}

	public void		OnSceneGUI()
	{
 		NuajLightningBolt	T = target as NuajLightningBolt;
		if ( T == null )
			return;

		// Setup the current UNDO target
		GUIHelpers.ms_UNDOObject = T;

		Matrix4x4	OldMatrix = Handles.matrix;
		Color		OldColor = Handles.color;

		Handles.matrix = T.transform.localToWorldMatrix;
		Handles.color = Color.yellow;

		// Draw the 2 position handles
		T.P0 = EditPosition( T.P0, T.GizmoCubeSize, "Change Start Position" );
		T.P1 = EditPosition( T.P1, T.GizmoCubeSize, "Change End Position" );

		Handles.matrix = OldMatrix;
		Handles.color = OldColor;

		if ( GUI.changed )
 			EditorUtility.SetDirty( T );
  	}

	protected Vector3	EditPosition( Vector3 _Value, float _GrabSize, string _UndoName )
	{
		Vector3	Result = Handles.FreeMoveHandle( _Value, Quaternion.identity, _GrabSize, Vector3.zero, EmptyCapFunction );

		if ( !Nuaj.Help.Approximately( _Value, Result ) )
			GUIHelpers.RegisterUndo( _UndoName );

		return Result;
	}

	protected void		EmptyCapFunction( int controlID, Vector3 position, Quaternion rotation, float size )
	{
		// Don't draw anything (we already draw nice cubes in the OnDrawGizmo function of our Lightning Bolt script class)
	}

	protected void	DisplayAltitude( Vector3 _Position )
	{
		NuajManager	M = FindObjectOfType( typeof(NuajManager) ) as NuajManager;
		if ( M == null )
			return;

		GUIHelpers.Label( new GUIContent( "Altitude = " + ((M.WorldUnit2Kilometer * _Position - M.PlanetCenter).magnitude - M.PlanetRadiusKm) + " kilometers" ) );
	}

	protected void	DisplayLength( NuajLightningBolt _Bolt )
	{
		NuajManager	M = FindObjectOfType( typeof(NuajManager) ) as NuajManager;
		if ( M == null )
			return;

		GUIHelpers.Label( new GUIContent( "Length = " + (M.WorldUnit2Kilometer * (_Bolt.P1 - _Bolt.P0).magnitude) + " kilometers" ) );
	}

	#endregion
}
