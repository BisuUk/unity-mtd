using System;
using System.Collections;
using UnityEngine;
using UnityEditor;

using Nuaj;

namespace Nuaj.GUI
{
	/// <summary>
	/// Base editor for Nuaj modules
	/// </summary>
	public abstract class ModuleEditorBase
	{
		#region FIELDS

		protected ModuleBase			m_BaseModule = null;

		#endregion

		#region PROPERTIES

		/// <summary>
		/// Gets the module this editor is watching
		/// </summary>
		public ModuleBase			Module		{ get { return m_BaseModule; } }

		/// <summary>
		/// Gets the caption for the tab control
		/// </summary>
		public abstract GUIContent	TabCaption	{ get; }	// TODO ! Add images on GUIContent

		/// <summary>
		/// Gets the module infos displayed at the top of the tab control
		/// </summary>
		protected abstract string	ModuleInfos	{ get; }

		/// <summary>
		/// Gets the URL of the help page on that module
		/// </summary>
		protected abstract string	HelpURL		{ get; }

		#endregion

		#region METHODS

		public ModuleEditorBase( ModuleBase _Module )
		{
			m_BaseModule = _Module;
		}

		public virtual void	OnSceneGUI()
		{
			// Show some gizmos
		}

		/// <summary>
		/// Displays default simple GUI for that module
		/// </summary>
		/// <returns>True if the rest of the GUI can be displayed, false if the module is in error state and shouldn't be modified</returns>
		public virtual bool	OnInspectorGUISimple()
		{
			ShowInfos();

			bool	bError = false;
			if ( m_BaseModule != null )
			{
				if ( m_BaseModule.IsInErrorState )
				{
					ShowErrorState();
					bError = true;
				}
				else
				{
					if ( m_BaseModule.IsInWarningState )
						ShowWarningState();

					ShowEnabledAndSimpleMode();
					GUIHelpers.Separate();
				}
			}

			if ( bError )
				return false;

			// Show common controls
			OnInspectorGUICommon();

			return true;
		}

		/// <summary>
		/// Displays default advanced GUI for that module
		/// </summary>
		/// <returns>True if the rest of the GUI can be displayed, false if the module is in error state and shouldn't be modified</returns>
		public virtual bool	OnInspectorGUIAdvanced()
		{
			ShowInfos();

			bool	bError = false;
			if ( m_BaseModule != null )
			{
				if ( m_BaseModule.IsInErrorState )
				{
					ShowErrorState();
					bError = true;
				}
				else
				{
					if ( m_BaseModule.IsInWarningState )
						ShowWarningState();

					ShowEnabledAndSimpleMode();
					GUIHelpers.Separate();
				}
			}

			if ( bError )
				return false;

			// Show common controls
			OnInspectorGUICommon();

			return true;
		}

		protected virtual void	OnInspectorGUICommon()
		{
			// Override to show common controls to both Simple and Advanced modes
		}

		protected void	ShowEnabledAndSimpleMode()
		{
			// Enabled + Simple/Advanced toggle button
			m_BaseModule.Enabled = GUIHelpers.CheckBox( new GUIContent( "Enabled", "Enables or disables the entire module" ), m_BaseModule.Enabled, m_BaseModule.Name + " " + (m_BaseModule.Enabled ? "Disabled" : "Enabled") );

			// Disable the GUI if the module is disabled
			if ( !m_BaseModule.Enabled )
				UnityEngine.GUI.enabled = false;
		}

		protected void	ShowErrorState()
		{
			GUIHelpers.Separate();
			GUIHelpers.InfosArea( "The module is in error state and cannot work at the moment... The reason is :\r\n\r\n" + m_BaseModule.Error, GUIHelpers.INFOS_AREA_TYPE.ERROR );
		}

		protected void	ShowWarningState()
		{
			GUIHelpers.Separate();
			GUIHelpers.InfosArea( "The module is in warning state and may not render properly at the moment... The reason is :\r\n\r\n" + m_BaseModule.Warning, GUIHelpers.INFOS_AREA_TYPE.WARNING );
		}

		protected void	ShowInfos()
		{
			GUIHelpers.BeginHorizontal();
			GUIHelpers.InfosArea( ModuleInfos, GUIHelpers.INFOS_AREA_TYPE.INFO );
			GUIHelpers.ShowHelp( HelpURL );
			GUIHelpers.EndHorizontal();
			GUIHelpers.Separate();
		}

		protected void	Indent()
		{
			EditorGUI.indentLevel++;
		}
		protected void	UnIndent()
		{
			EditorGUI.indentLevel--;
		}

		#endregion
	}
}