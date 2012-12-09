using System;
using System.Collections;
using UnityEngine;
using UnityEditor;

using Nuaj;
using Nuaj.GUI;

[CustomEditor( typeof(NuajMapLocator) )]
public class MapLocatorEditor : Editor
{
	#region METHODS

	public override void	OnInspectorGUI()
	{
		NuajMapLocator	T = target as NuajMapLocator;
		if ( T == null )
		{	// Invalid manager !
			Debug.LogError( "Invalid NuajMapLocator to inspect in GUI !" );
			return;
		}

		// Setup the current UNDO target
		GUIHelpers.ms_UNDOObject = T;

 		T.Texture = GUIHelpers.SelectTexture( new GUIContent( "Texture", "Sets the texture to position via this locator" ), T.Texture, "Change Locator Texture" );
 		T.Offset = GUIHelpers.Vector4Box( new GUIContent( "Offset", "Sets the offset applied to texture components.\nNOTE: Exact formula is RGBA' = Offset + Factor * RGBA" ), T.Offset, "Change Locator Offset" );
 		T.Factor = GUIHelpers.Vector4Box( new GUIContent( "Factor", "Sets the factor applied to texture components.\nNOTE: Exact formula is RGBA' = Offset + Factor * RGBA" ), T.Factor, "Change Locator Factor" );

		if ( GUI.changed )
 			EditorUtility.SetDirty( T );
	}

	#endregion
}
