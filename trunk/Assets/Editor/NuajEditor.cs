using System;
using System.Collections;
using UnityEngine;
using UnityEditor;

using Nuaj;
using Nuaj.GUI;

[CustomEditor( typeof(NuajManager) )]
public class NuajEditor : Editor
{
	#region FIELDS

	// Cached manager and module editors
	protected NuajManager			m_Manager = null;
	protected ModuleEditorBase[]	m_ModuleEditors = null;
	protected GUIContent[]			m_ModuleTabCaptions = null;

	protected int					m_SelectedTab = 0;

	protected bool					m_bShowSceneGizmos = false;

	#endregion

	#region PROPERTIES

	/// <summary>
	/// Assigns the manager and rebuilds the module editors
	/// </summary>
	protected NuajManager	Manager
	{
		get { return m_Manager; }
		set
		{
			if ( value == m_Manager && m_ModuleEditors != null )
				return;	// No change...

			m_Manager = value;
			if ( m_Manager == null )
				return;

			ModuleBase[]	Modules = m_Manager.Modules;
			m_ModuleEditors = new ModuleEditorBase[1+Modules.Length];

			int	ModuleIndex = 0;
			m_ModuleEditors[ModuleIndex++] = new ModuleEditorMain( m_Manager );	// Special case for the manager

			// Create module editors
			foreach ( ModuleBase Module in Modules )
			{
				if ( Module is ModulePerspective )
					m_ModuleEditors[ModuleIndex++] = new ModuleEditorPerspective( Module as ModulePerspective );
				else if ( Module is ModuleCloudLayer )
					m_ModuleEditors[ModuleIndex++] = new ModuleEditorCloudLayer( Module as ModuleCloudLayer );
				else if ( Module is ModuleCloudVolume )
					m_ModuleEditors[ModuleIndex++] = new ModuleEditorCloudVolume( Module as ModuleCloudVolume );
				else if ( Module is ModuleSatellites )
					m_ModuleEditors[ModuleIndex++] = new ModuleEditorSatellites( Module as ModuleSatellites );
			}

			// Create the module tab captions
			m_ModuleTabCaptions = new GUIContent[1+Modules.Length];
			for ( ModuleIndex=0; ModuleIndex < m_ModuleEditors.Length; ModuleIndex++ )
			{
				ModuleEditorBase	ModuleEditor = m_ModuleEditors[ModuleIndex];

				m_ModuleTabCaptions[ModuleIndex] = ModuleEditor != null ?
					ModuleEditor.TabCaption :
					new GUIContent( "INVALID EDITOR !", "No editor could be found to edit a module of type \"" + Modules[ModuleIndex-1].GetType().FullName + "\" !" );
			}
		}
	}

	#endregion

	#region METHODS

	public override void	OnInspectorGUI()
	{
		Manager = target as NuajManager;
		if ( Manager == null )
		{	// Invalid manager !
			Debug.LogError( "Invalid NuajManager to inspect in GUI !" );
			return;
		}

		// Setup the current UNDO target
		GUIHelpers.ms_UNDOObject = Manager;

		// Show the tab control
		GUI.changed = false;
		GUIHelpers.TabPage( ref m_SelectedTab, m_ModuleTabCaptions );
		ModuleEditorBase	ModuleEditor = m_ModuleEditors[m_SelectedTab];
		if ( ModuleEditor == null )
			return;

		ModuleEditor.OnInspectorGUIAdvanced();

		GUI.enabled = true;

		// Mark the manager as dirty
		if ( GUI.changed )
			EditorUtility.SetDirty( target );
	}

	public void		OnSceneGUI()
	{
		if ( !m_bShowSceneGizmos || m_ModuleEditors == null )
			return;

		// Backup
		Matrix4x4	OldMatrix = Handles.matrix;
		Color		OldColor = Handles.color;

		foreach ( ModuleEditorBase Ed in m_ModuleEditors )
			Ed.OnSceneGUI();

		// Restore
		Handles.matrix = OldMatrix;
		Handles.color = OldColor;
	}

	#endregion
}
